import 'dart:async';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geolocator_android/geolocator_android.dart';
import 'package:geolocator_apple/geolocator_apple.dart';
import 'package:sensors_plus/sensors_plus.dart';

import '../../../core/storage/token_storage.dart';
import '../../auth/presentation/login_page.dart';
import '../data/rides_api.dart';
import '../data/telemetry_api.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with WidgetsBindingObserver {
  final _tokenStorage = TokenStorage();
  final _ridesApi = RidesApi();
  final _telemetryApi = TelemetryApi();

  bool _isLoading = true;
  bool _isActionLoading = false;
  String? _errorText;
  String? _token;
  Map<String, dynamic>? _activeRide;
  String? _lastTelemetryResult;

  Timer? _flushTimer;
  StreamSubscription<Position>? _positionSubscription;
  StreamSubscription<AccelerometerEvent>? _accelerometerSubscription;

  Position? _lastPosition;
  final List<Map<String, dynamic>> _pendingPoints = [];

  double _accelX = 0.0;
  double _accelY = 0.0;
  double _accelZ = 9.8;
  double _filteredAccelY = 0.0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _startAccelerometer();
    _loadInitial();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _stopTelemetryLoop();
    _accelerometerSubscription?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (_activeRide == null) return;

    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.resumed) {
      if (mounted) {
        setState(() {});
      }
    }
  }

  void _startAccelerometer() {
    _accelerometerSubscription?.cancel();

    const alpha = 0.2;

    _accelerometerSubscription =
        accelerometerEventStream().listen((event) {
      _accelX = event.x;
      _accelY = event.y;
      _accelZ = event.z;

      _filteredAccelY = alpha * _accelY + (1 - alpha) * _filteredAccelY;

      if (mounted) {
        setState(() {});
      }
    });
  }

  Future<void> _loadInitial() async {
    setState(() {
      _isLoading = true;
      _errorText = null;
    });

    try {
      final token = await _tokenStorage.getToken();

      if (token == null || token.isEmpty) {
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const LoginPage()),
        );
        return;
      }

      final activeRide = await _ridesApi.getActiveRide(token);

      setState(() {
        _token = token;
        _activeRide = activeRide;
      });

      if (activeRide != null) {
        await _startTelemetryLoop();
      }
    } catch (e) {
      setState(() {
        _errorText = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<bool> _ensureLocationPermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      setState(() {
        _errorText = 'Location services are disabled';
      });
      return false;
    }

    var permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied) {
      setState(() {
        _errorText = 'Location permission denied';
      });
      return false;
    }

    if (permission == LocationPermission.deniedForever) {
      setState(() {
        _errorText = 'Location permission permanently denied';
      });
      return false;
    }

    return true;
  }

  LocationSettings _buildLocationSettings() {
    if (!kIsWeb && Platform.isAndroid) {
      return AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
        intervalDuration: const Duration(seconds: 10),
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationTitle: 'Courier tracking aktif',
          notificationText: 'Konum arka planda izleniyor',
          enableWakeLock: true,
        ),
      );
    }

    if (!kIsWeb && Platform.isIOS) {
      return AppleSettings(
        accuracy: LocationAccuracy.bestForNavigation,
        activityType: ActivityType.automotiveNavigation,
        distanceFilter: 10,
        pauseLocationUpdatesAutomatically: false,
        showBackgroundLocationIndicator: true,
      );
    }

    return const LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10,
    );
  }

  Map<String, dynamic> _buildPoint(Position position) {
    return {
      'ts': DateTime.now().toUtc().toIso8601String(),
      'lat': position.latitude,
      'lng': position.longitude,
      'speedKmh': (position.speed >= 0 ? position.speed * 3.6 : 0),
      'accuracyM': position.accuracy,
      'heading': position.heading,
      'accelX': _accelX,
      'accelY': _filteredAccelY,
      'accelZ': _accelZ,
      'batteryLevel': 0.7,
      'networkType': 'cellular',
    };
  }

  Future<void> _startPositionStream() async {
    _positionSubscription?.cancel();

    final granted = await _ensureLocationPermission();
    if (!granted) return;

    final locationSettings = _buildLocationSettings();

    _positionSubscription =
        Geolocator.getPositionStream(locationSettings: locationSettings)
            .listen(
      (position) {
        _lastPosition = position;
        _pendingPoints.add(_buildPoint(position));

        if (mounted) {
          setState(() {});
        }
      },
      onError: (error) {
        if (mounted) {
          setState(() {
            _errorText = error.toString();
          });
        }
      },
    );
  }

  Future<void> _flushPendingPoints() async {
    if (_token == null || _activeRide == null) return;
    if (_pendingPoints.isEmpty) return;

    final pointsToSend = List<Map<String, dynamic>>.from(_pendingPoints);
    _pendingPoints.clear();

    final result = await _telemetryApi.sendBatch(
      token: _token!,
      rideId: _activeRide!['id'],
      points: pointsToSend,
    );

    setState(() {
      _activeRide = {
        ..._activeRide!,
        'score': result['score'],
      };
      _lastTelemetryResult = result.toString();
    });
  }

  Future<void> _sendLiveTelemetryOnce() async {
    if (_token == null || _activeRide == null) return;

    final granted = await _ensureLocationPermission();
    if (!granted) return;

    final position = await Geolocator.getCurrentPosition(
      locationSettings: _buildLocationSettings(),
    );

    _lastPosition = position;

    final result = await _telemetryApi.sendBatch(
      token: _token!,
      rideId: _activeRide!['id'],
      points: [_buildPoint(position)],
    );

    setState(() {
      _activeRide = {
        ..._activeRide!,
        'score': result['score'],
      };
      _lastTelemetryResult = result.toString();
    });
  }

  Future<void> _startTelemetryLoop() async {
    _stopTelemetryLoop();
    await _startPositionStream();

    _flushTimer = Timer.periodic(const Duration(seconds: 10), (_) async {
      try {
        await _flushPendingPoints();
      } catch (e) {
        if (mounted) {
          setState(() {
            _errorText = e.toString();
          });
        }
      }
    });
  }

  void _stopTelemetryLoop() {
    _flushTimer?.cancel();
    _flushTimer = null;
    _positionSubscription?.cancel();
    _positionSubscription = null;
  }

  Future<void> _startRide() async {
    if (_token == null) return;

    setState(() {
      _isActionLoading = true;
      _errorText = null;
    });

    try {
      final ride = await _ridesApi.startRide(_token!);

      setState(() {
        _activeRide = ride;
      });

      await _startTelemetryLoop();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ride started')),
      );
    } catch (e) {
      setState(() {
        _errorText = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() => _isActionLoading = false);
      }
    }
  }

  Future<void> _endRide() async {
    if (_token == null || _activeRide == null) return;

    setState(() {
      _isActionLoading = true;
      _errorText = null;
    });

    try {
      await _flushPendingPoints();
      _stopTelemetryLoop();

      await _ridesApi.endRide(
        token: _token!,
        rideId: _activeRide!['id'],
      );

      setState(() {
        _activeRide = null;
        _lastTelemetryResult = null;
        _pendingPoints.clear();
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ride ended')),
      );
    } catch (e) {
      setState(() {
        _errorText = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() => _isActionLoading = false);
      }
    }
  }

  Future<void> _logout() async {
    _stopTelemetryLoop();
    await _tokenStorage.clearToken();

    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const LoginPage()),
    );
  }

  Color _statusColor() {
    return _activeRide != null ? Colors.green : Colors.grey;
  }

  String _statusLabel() {
    return _activeRide != null ? 'ACTIVE RIDE' : 'NO ACTIVE RIDE';
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final score = _activeRide?['score']?.toString() ?? '-';
    final rideId = _activeRide?['id']?.toString() ?? '-';
    final startedAt = _activeRide?['startedAt']?.toString();
    final speedKmh = _lastPosition != null
        ? (_lastPosition!.speed * 3.6).toStringAsFixed(2)
        : '-';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Courier Home'),
        actions: [
          IconButton(
            onPressed: _logout,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            elevation: 1,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: _statusColor().withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          _statusLabel(),
                          style: TextStyle(
                            color: _statusColor(),
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        'Score: $score',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 18,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _InfoRow(label: 'Ride ID', value: rideId),
                  _InfoRow(
                    label: 'Started At',
                    value: startedAt ?? '-',
                  ),
                  _InfoRow(
                    label: 'Pending Points',
                    value: _pendingPoints.length.toString(),
                  ),
                  _InfoRow(
                    label: 'Speed',
                    value: '$speedKmh km/h',
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (_errorText != null)
            Card(
              color: Colors.red.shade50,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  _errorText!,
                  style: const TextStyle(color: Colors.red),
                ),
              ),
            ),
          const SizedBox(height: 16),
          Card(
            elevation: 1,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: (_isActionLoading || _activeRide != null)
                          ? null
                          : _startRide,
                      child: const Text('Start Ride'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: (_isActionLoading || _activeRide == null)
                          ? null
                          : _endRide,
                      child: const Text('End Ride'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: (_isActionLoading || _activeRide == null)
                          ? null
                          : _sendLiveTelemetryOnce,
                      child: const Text('Send Live Telemetry'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: (_isActionLoading || _activeRide == null)
                          ? null
                          : _flushPendingPoints,
                      child: const Text('Flush Pending Points'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            elevation: 1,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Sensor & Location Debug',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _InfoRow(
                    label: 'Accel Y raw',
                    value: _accelY.toStringAsFixed(2),
                  ),
                  _InfoRow(
                    label: 'Accel Y filtered',
                    value: _filteredAccelY.toStringAsFixed(2),
                  ),
                  _InfoRow(
                    label: 'Latitude',
                    value: _lastPosition != null
                        ? _lastPosition!.latitude.toStringAsFixed(6)
                        : '-',
                  ),
                  _InfoRow(
                    label: 'Longitude',
                    value: _lastPosition != null
                        ? _lastPosition!.longitude.toStringAsFixed(6)
                        : '-',
                  ),
                  _InfoRow(
                    label: 'Accuracy',
                    value: _lastPosition != null
                        ? '${_lastPosition!.accuracy.toStringAsFixed(2)} m'
                        : '-',
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (_lastTelemetryResult != null)
            Card(
              elevation: 1,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: SelectableText(
                  _lastTelemetryResult!,
                  style: const TextStyle(fontSize: 12),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                color: Colors.black54,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}