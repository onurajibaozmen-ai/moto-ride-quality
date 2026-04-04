import 'dart:async';
import 'dart:io' show Platform;
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geolocator_android/geolocator_android.dart';
import 'package:geolocator_apple/geolocator_apple.dart';
import 'package:sensors_plus/sensors_plus.dart';

import '../../../core/auth/auth_manager.dart';
import '../../auth/presentation/login_page.dart';
import '../data/orders_api.dart';
import '../data/rides_api.dart';
import '../data/telemetry_api.dart';
import '../data/telemetry_queue.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with WidgetsBindingObserver {
  final _ridesApi = RidesApi();
  final _telemetryApi = TelemetryApi();
  final _telemetryQueue = TelemetryQueue();
  final _ordersApi = OrdersApi();

  static const double _actionDistanceThresholdM = 150;

  bool _isLoading = true;
  bool _isActionLoading = false;
  bool _isSyncingQueue = false;
  String? _busyOrderId;

  String? _errorText;
  String? _statusText;
  String? _token;
  Map<String, dynamic>? _activeRide;
  String? _lastTelemetryResult;
  Map<String, dynamic>? _me;
  List<Map<String, dynamic>> _assignedOrders = [];
  Map<String, dynamic>? _ridePlan;

  Timer? _flushTimer;
  StreamSubscription<Position>? _positionSubscription;
  StreamSubscription<AccelerometerEvent>? _accelerometerSubscription;

  Position? _lastPosition;
  final List<Map<String, dynamic>> _pendingPoints = [];
  final TextEditingController _deliveryNoteController = TextEditingController();

  int _queuedBatchCount = 0;

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
    _deliveryNoteController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refreshAll(silent: true);
    }
  }

  String? get _activeRideId {
    final dynamic id = _activeRide?['id'];
    if (id == null) return null;
    return id.toString();
  }

  String? get _courierId {
    final dynamic id = _me?['id'] ?? _me?['userId'];
    if (id == null) return null;
    return id.toString();
  }

  bool get _hasActiveRide => _activeRide != null;

  List<Map<String, dynamic>> get _recommendedStops {
    final raw = _ridePlan?['recommendedSequence'];
    if (raw is! List) return [];

    return raw
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  int get _completedStopCount {
    return _recommendedStops.where((stop) {
      final type = stop['type']?.toString();
      final status = stop['status']?.toString() ?? '';

      if (type == 'pickup') {
        return status == 'PICKED_UP' || status == 'DELIVERED';
      }

      if (type == 'dropoff') {
        return status == 'DELIVERED';
      }

      return false;
    }).length;
  }

  int get _totalStopCount => _recommendedStops.length;

  double get _routeProgress {
    if (_totalStopCount == 0) return 0;
    return _completedStopCount / _totalStopCount;
  }

  Map<String, dynamic>? get _nextActionableStop {
    for (final stop in _recommendedStops) {
      final type = stop['type']?.toString();
      final status = stop['status']?.toString() ?? '';

      if (type == 'pickup' && status == 'ASSIGNED') {
        return stop;
      }

      if (type == 'dropoff' && status == 'PICKED_UP') {
        return stop;
      }
    }
    return null;
  }

  String? get _nextActionableOrderId {
    final orderId = _nextActionableStop?['orderId'];
    return orderId?.toString();
  }

  double? get _distanceToNextStopM {
    final stop = _nextActionableStop;
    final pos = _lastPosition;

    if (stop == null || pos == null) return null;

    final lat = (stop['lat'] as num?)?.toDouble();
    final lng = (stop['lng'] as num?)?.toDouble();

    if (lat == null || lng == null) return null;

    return _calculateDistanceMeters(
      pos.latitude,
      pos.longitude,
      lat,
      lng,
    );
  }

  bool get _isNearNextStop {
    final distance = _distanceToNextStopM;
    if (distance == null) return false;
    return distance <= _actionDistanceThresholdM;
  }

  void _setError(Object error) {
    if (!mounted) return;
    setState(() {
      _errorText = error.toString();
    });
  }

  void _clearError() {
    if (!mounted) return;
    setState(() {
      _errorText = null;
    });
  }

  void _setStatus(String message) {
    if (!mounted) return;
    setState(() {
      _statusText = message;
    });
  }

  void _clearStatus() {
    if (!mounted) return;
    setState(() {
      _statusText = null;
    });
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  String _newBatchId() {
    return DateTime.now().millisecondsSinceEpoch.toString();
  }

  String _formatDistance(double? meters) {
    if (meters == null) return '-';
    if (meters >= 1000) {
      return '${(meters / 1000).toStringAsFixed(2)} km';
    }
    return '${meters.toStringAsFixed(0)} m';
  }

  String _formatDate(dynamic value) {
    if (value == null) return '-';
    try {
      return DateTime.parse(value.toString()).toLocal().toString();
    } catch (_) {
      return value.toString();
    }
  }

  double _calculateDistanceMeters(
    double lat1,
    double lng1,
    double lat2,
    double lng2,
  ) {
    const earthRadiusM = 6371000.0;

    double toRad(double value) => value * math.pi / 180;

    final dLat = toRad(lat2 - lat1);
    final dLng = toRad(lng2 - lng1);

    final a =
        math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(toRad(lat1)) *
            math.cos(toRad(lat2)) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);

    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return earthRadiusM * c;
  }

  Future<void> _reloadQueueCount() async {
    final queue = await _telemetryQueue.loadQueue();
    if (!mounted) return;
    setState(() {
      _queuedBatchCount = queue.length;
    });
  }

  void _startAccelerometer() {
    _accelerometerSubscription?.cancel();

    const alpha = 0.2;

    _accelerometerSubscription = accelerometerEventStream().listen((event) {
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
      _statusText = null;
    });

    try {
      await AuthManager.instance.init();
      final token = AuthManager.instance.token;

      if (token == null || token.isEmpty) {
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const LoginPage()),
        );
        return;
      }

      _token = token;
      _me = AuthManager.instance.user;
      await _reloadQueueCount();
      await _refreshAll(silent: true);
    } catch (e) {
      _setError(e);
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _refreshAll({bool silent = false}) async {
    await _refreshActiveRide(silent: silent);
    await _syncQueuedBatches(silent: true);
    await _refreshAssignedOrders(silent: silent);
    await _refreshRidePlan(silent: silent);
  }

  Future<void> _refreshActiveRide({bool silent = false}) async {
    if (_token == null || _token!.isEmpty) return;

    try {
      final activeRide = await _ridesApi.getActiveRide(_token!);

      if (!mounted) return;

      setState(() {
        _activeRide = activeRide;
        if (silent) {
          _errorText = null;
        }
      });

      if (activeRide != null) {
        await _startTelemetryLoop();
      } else {
        _stopTelemetryLoop();
        if (mounted) {
          setState(() {
            _ridePlan = null;
          });
        }
      }
    } catch (e) {
      if (!silent) {
        _setError(e);
      }
    }
  }

  Future<void> _refreshAssignedOrders({bool silent = false}) async {
    final courierId = _courierId;
    if (courierId == null || courierId.isEmpty) return;

    try {
      final orders = await _ordersApi.getOrders(courierId: courierId);

      if (!mounted) return;
      setState(() {
        _assignedOrders = orders;
      });
    } catch (e) {
      if (!silent) {
        _setError(e);
      }
    }
  }

  Future<void> _refreshRidePlan({bool silent = false}) async {
    final rideId = _activeRideId;
    if (rideId == null || rideId.isEmpty) return;

    try {
      final plan = await _ordersApi.getRidePlan(rideId);

      if (!mounted) return;
      setState(() {
        _ridePlan = plan;
      });
    } catch (e) {
      if (!silent) {
        _setError(e);
      }
    }
  }

  Future<bool> _ensureLocationPermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _setError('Location services are disabled');
      return false;
    }

    var permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied) {
      _setError('Location permission denied');
      return false;
    }

    if (permission == LocationPermission.deniedForever) {
      _setError('Location permission permanently denied');
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
      'speedKmh': position.speed >= 0 ? position.speed * 3.6 : 0,
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
        Geolocator.getPositionStream(locationSettings: locationSettings).listen(
      (position) {
        _lastPosition = position;
        _pendingPoints.add(_buildPoint(position));

        if (mounted) {
          setState(() {});
        }
      },
      onError: (error) {
        debugPrint('❌ position stream error: $error');
      },
    );
  }

  Future<void> _enqueueBatch({
    required String rideId,
    required String clientBatchId,
    required List<Map<String, dynamic>> points,
  }) async {
    await _telemetryQueue.enqueue({
      'rideId': rideId,
      'clientBatchId': clientBatchId,
      'points': points,
      'createdAt': DateTime.now().toUtc().toIso8601String(),
    });

    await _reloadQueueCount();
  }

  Future<void> _syncQueuedBatches({bool silent = false}) async {
    if (_token == null || _token!.isEmpty) return;
    if (_isSyncingQueue) return;

    _isSyncingQueue = true;

    try {
      final queue = await _telemetryQueue.loadQueue();

      if (queue.isEmpty) {
        await _reloadQueueCount();
        return;
      }

      for (final item in queue) {
        final rideId = item['rideId']?.toString();
        final clientBatchId = item['clientBatchId']?.toString();
        final rawPoints = item['points'];

        if (rideId == null || clientBatchId == null || rawPoints is! List) {
          continue;
        }

        final points = rawPoints
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();

        try {
          final result = await _telemetryApi.sendBatch(
            token: _token!,
            rideId: rideId,
            clientBatchId: clientBatchId,
            points: points,
          );

          await _telemetryQueue.removeByBatchId(clientBatchId);

          if (mounted && _activeRideId == rideId) {
            setState(() {
              _activeRide = {
                ...?_activeRide,
                'score': result['score'],
              };
              _lastTelemetryResult = result.toString();
            });
          }
        } catch (e) {
          debugPrint('❌ queued batch sync failed: $e');
          break;
        }
      }

      await _reloadQueueCount();

      if (!silent && mounted) {
        setState(() {
          _statusText = 'Queued telemetry sync complete';
        });
      }
    } finally {
      _isSyncingQueue = false;
    }
  }

  Future<void> _flushPendingPoints({bool silent = false}) async {
    if (_token == null || _activeRide == null) return;
    if (_pendingPoints.isEmpty) return;
    if (_activeRideId == null) return;

    final pointsToSend = List<Map<String, dynamic>>.from(_pendingPoints);
    _pendingPoints.clear();
    final clientBatchId = _newBatchId();

    try {
      final result = await _telemetryApi.sendBatch(
        token: _token!,
        rideId: _activeRideId!,
        clientBatchId: clientBatchId,
        points: pointsToSend,
      );

      if (!mounted) return;

      setState(() {
        _activeRide = {
          ...?_activeRide,
          'score': result['score'],
        };
        _lastTelemetryResult = result.toString();
        if (!silent) {
          _statusText = 'Telemetry synced';
        }
      });
    } catch (e) {
      await _enqueueBatch(
        rideId: _activeRideId!,
        clientBatchId: clientBatchId,
        points: pointsToSend,
      );

      debugPrint('❌ flushPendingPoints error, queued locally: $e');

      if (!silent && mounted) {
        setState(() {
          _statusText = 'Telemetry queued offline';
        });
      }
    }
  }

  Future<void> _sendLiveTelemetryOnce() async {
    if (_token == null || _activeRide == null || _activeRideId == null) return;

    try {
      _clearError();
      _setStatus('Sending live telemetry...');

      final granted = await _ensureLocationPermission();
      if (!granted) return;

      final position = await Geolocator.getCurrentPosition(
        locationSettings: _buildLocationSettings(),
      );

      _lastPosition = position;

      final clientBatchId = _newBatchId();

      final result = await _telemetryApi.sendBatch(
        token: _token!,
        rideId: _activeRideId!,
        clientBatchId: clientBatchId,
        points: [_buildPoint(position)],
      );

      if (!mounted) return;

      setState(() {
        _activeRide = {
          ...?_activeRide,
          'score': result['score'],
        };
        _lastTelemetryResult = result.toString();
        _statusText = 'Live telemetry sent';
      });
    } catch (e) {
      _setError(e);
    }
  }

  Future<void> _startTelemetryLoop() async {
    _stopTelemetryLoop();
    await _startPositionStream();

    _flushTimer = Timer.periodic(const Duration(seconds: 10), (_) async {
      await _flushPendingPoints(silent: true);
      await _syncQueuedBatches(silent: true);
    });
  }

  void _stopTelemetryLoop() {
    _flushTimer?.cancel();
    _flushTimer = null;
    _positionSubscription?.cancel();
    _positionSubscription = null;
  }

  Future<void> _startRide() async {
    if (_token == null || _token!.isEmpty) {
      _setError('Missing auth token');
      return;
    }

    setState(() {
      _isActionLoading = true;
      _errorText = null;
      _statusText = 'Starting ride...';
    });

    try {
      final ride = await _ridesApi.startRide(_token!);

      if (!mounted) return;

      setState(() {
        _activeRide = ride;
        _errorText = null;
        _statusText = 'Ride started';
      });

      await _startTelemetryLoop();
      await _refreshRidePlan(silent: true);
      _showMessage('Ride started');
    } catch (e) {
      _setError(e);
    } finally {
      if (mounted) {
        setState(() => _isActionLoading = false);
      }
    }
  }

  Future<void> _endRide() async {
    if (_token == null || _token!.isEmpty) {
      _setError('Missing auth token');
      return;
    }

    if (_activeRide == null || _activeRideId == null || _activeRideId!.isEmpty) {
      _setError('No active ride found');
      return;
    }

    setState(() {
      _isActionLoading = true;
      _errorText = null;
      _statusText = 'Ending ride...';
    });

    try {
      debugPrint('🛑 Ending ride with id: $_activeRideId');

      try {
        await _flushPendingPoints(silent: true).timeout(
          const Duration(seconds: 5),
        );
      } catch (e) {
        debugPrint('⚠️ flush before endRide failed: $e');
      }

      _stopTelemetryLoop();

      final response = await _ridesApi.endRide(_token!, _activeRideId!);

      debugPrint('✅ endRide response: $response');

      if (!mounted) return;

      setState(() {
        _activeRide = null;
        _ridePlan = null;
        _lastTelemetryResult = null;
        _pendingPoints.clear();
        _errorText = null;
        _statusText = 'Ride ended';
      });

      _showMessage('Ride ended');
      await _reloadQueueCount();
      await _refreshAssignedOrders(silent: true);
    } catch (e) {
      debugPrint('❌ endRide error: $e');

      if (!mounted) return;
      setState(() {
        _errorText = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isActionLoading = false;
        });
      }
    }
  }

  Future<void> _markPickedUp(String orderId) async {
    setState(() {
      _busyOrderId = orderId;
      _errorText = null;
      _statusText = 'Marking order as picked up...';
    });

    try {
      await _ordersApi.markPickedUp(orderId);
      await _refreshAssignedOrders(silent: true);
      await _refreshRidePlan(silent: true);
      _showMessage('Order marked as picked up');
    } catch (e) {
      _setError(e);
    } finally {
      if (mounted) {
        setState(() {
          _busyOrderId = null;
        });
      }
    }
  }

  Future<void> _markDelivered(String orderId) async {
    setState(() {
      _busyOrderId = orderId;
      _errorText = null;
      _statusText = 'Marking order as delivered...';
    });

    try {
      final note = _deliveryNoteController.text.trim();
      debugPrint('📦 delivery note for $orderId: $note');

      await _ordersApi.markDelivered(orderId);
      _deliveryNoteController.clear();

      await _refreshAssignedOrders(silent: true);
      await _refreshRidePlan(silent: true);

      _showMessage(
        note.isEmpty
            ? 'Order marked as delivered'
            : 'Order marked as delivered • note saved locally',
      );
    } catch (e) {
      _setError(e);
    } finally {
      if (mounted) {
        setState(() {
          _busyOrderId = null;
        });
      }
    }
  }

  Future<void> _logout() async {
    _stopTelemetryLoop();
    await AuthManager.instance.logout();

    if (!mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (_) => false,
    );
  }

  Future<void> _handleRefresh() async {
    _clearError();
    _clearStatus();
    await _refreshAll();
  }

  Color _statusColor() {
    return _hasActiveRide ? Colors.green : Colors.grey;
  }

  String _statusLabel() {
    return _hasActiveRide ? 'ACTIVE RIDE' : 'NO ACTIVE RIDE';
  }

  String _formatStopType(String type) {
    return type == 'pickup' ? 'Pickup' : 'Dropoff';
  }

  bool _isNextStopForOrder(String orderId) {
    return _nextActionableOrderId == orderId;
  }

  String _actionHint(String orderId, String status) {
    if (!_hasActiveRide) {
      return 'Start a ride first';
    }

    if (_nextActionableOrderId == null) {
      return 'No pending stop';
    }

    if (_nextActionableOrderId != orderId) {
      final nextRef =
          _nextActionableStop?['orderRef']?.toString() ?? 'next stop';
      return 'Complete $nextRef first';
    }

    if (!_isNearNextStop) {
      return 'Move closer to next stop (${_formatDistance(_distanceToNextStopM)})';
    }

    if (status == 'ASSIGNED') {
      return 'Next action: Pickup';
    }

    if (status == 'PICKED_UP') {
      return 'Next action: Deliver';
    }

    return 'No action available';
  }

  bool _canPickup(String orderId, String status) {
    return _isNextStopForOrder(orderId) &&
        _isNearNextStop &&
        status == 'ASSIGNED';
  }

  bool _canDeliver(String orderId, String status) {
    return _isNextStopForOrder(orderId) &&
        _isNearNextStop &&
        status == 'PICKED_UP';
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final score = _activeRide?['score']?.toString() ?? '-';
    final rideId = _activeRideId ?? '-';
    final startedAt = _activeRide?['startedAt']?.toString();
    final speedKmh = _lastPosition != null
        ? (_lastPosition!.speed * 3.6).toStringAsFixed(2)
        : '-';

    final recommendedStops = _recommendedStops;
    final nextStop = _nextActionableStop;
    final nextStopLabel = nextStop == null
        ? 'No pending stop'
        : '${_formatStopType(nextStop['type']?.toString() ?? 'dropoff')} • ${nextStop['orderRef']?.toString() ?? '-'}';
    final nextStopDistance = _formatDistance(_distanceToNextStopM);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Courier Home'),
        actions: [
          IconButton(
            onPressed: _isActionLoading ? null : _handleRefresh,
            icon: const Icon(Icons.refresh),
          ),
          IconButton(
            onPressed: _isActionLoading ? null : _logout,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _handleRefresh,
        child: ListView(
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
                    _InfoRow(label: 'Started At', value: startedAt ?? '-'),
                    _InfoRow(label: 'Pending Points', value: _pendingPoints.length.toString()),
                    _InfoRow(label: 'Queued Batches', value: _queuedBatchCount.toString()),
                    _InfoRow(label: 'Assigned Orders', value: _assignedOrders.length.toString()),
                    _InfoRow(label: 'Next Stop', value: nextStopLabel),
                    _InfoRow(label: 'Distance To Next', value: nextStopDistance),
                    _InfoRow(label: 'Action Radius', value: '${_actionDistanceThresholdM.toStringAsFixed(0)} m'),
                    _InfoRow(label: 'Speed', value: '$speedKmh km/h'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
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
                      'Route Progress',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                    ),
                    const SizedBox(height: 12),
                    LinearProgressIndicator(value: _routeProgress, minHeight: 10),
                    const SizedBox(height: 10),
                    Text(
                      'Completed $_completedStopCount / $_totalStopCount stops',
                      style: TextStyle(color: Colors.blueGrey.shade700),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            if (_statusText != null)
              Card(
                color: Colors.blue.shade50,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    _statusText!,
                    style: TextStyle(color: Colors.blue.shade900),
                  ),
                ),
              ),
            if (_statusText != null) const SizedBox(height: 12),
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
            if (_errorText != null) const SizedBox(height: 12),
            if (_hasActiveRide && nextStop != null)
              Card(
                color: _isNearNextStop ? Colors.green.shade50 : Colors.amber.shade50,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    _isNearNextStop
                        ? 'You are within action range of the next stop.'
                        : 'Move closer to the next stop to unlock action buttons.',
                    style: TextStyle(
                      color: _isNearNextStop
                          ? Colors.green.shade900
                          : Colors.amber.shade900,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            if (_hasActiveRide && nextStop != null) const SizedBox(height: 12),
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
                        onPressed: (_isActionLoading || _hasActiveRide) ? null : _startRide,
                        child: Text(
                          _isActionLoading && !_hasActiveRide ? 'Working...' : 'Start Ride',
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: (_isActionLoading || !_hasActiveRide) ? null : _endRide,
                        child: Text(
                          _isActionLoading && _hasActiveRide ? 'Working...' : 'End Ride',
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: (_isActionLoading || !_hasActiveRide)
                            ? null
                            : _sendLiveTelemetryOnce,
                        child: const Text('Send Live Telemetry'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: (_isActionLoading || !_hasActiveRide)
                            ? null
                            : () => _flushPendingPoints(),
                        child: const Text('Flush Pending Points'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: _isActionLoading ? null : () => _syncQueuedBatches(),
                        child: const Text('Retry Queued Batches'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (_hasActiveRide)
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
                        'Proof of Delivery Note',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _deliveryNoteController,
                        minLines: 2,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          hintText: 'e.g. handed to customer, left at reception',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            if (_hasActiveRide) const SizedBox(height: 16),
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
                      'Assigned Orders',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                    ),
                    const SizedBox(height: 12),
                    if (_assignedOrders.isEmpty)
                      const Text('No assigned orders')
                    else
                      ..._assignedOrders.take(8).map((order) {
                        final orderId = order['id']?.toString() ?? '';
                        final ref = order['externalRef']?.toString() ?? orderId;
                        final status = order['status']?.toString() ?? '-';
                        final isBusy = _busyOrderId == orderId;
                        final isNext = _isNextStopForOrder(orderId);
                        final actualPickup = order['actualPickupTime'];
                        final actualDelivery = order['actualDeliveryTime'];

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isNext ? Colors.amber.shade50 : Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isNext ? Colors.amber.shade300 : Colors.transparent,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        ref,
                                        style: const TextStyle(fontWeight: FontWeight.w700),
                                      ),
                                    ),
                                    if (isNext)
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.amber.shade200,
                                          borderRadius: BorderRadius.circular(999),
                                        ),
                                        child: const Text(
                                          'NEXT',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  'Status: $status',
                                  style: TextStyle(color: Colors.blueGrey.shade700),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Pickup: ${_formatDate(actualPickup)}',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.blueGrey.shade600,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Delivery: ${_formatDate(actualDelivery)}',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.blueGrey.shade600,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  _actionHint(orderId, status),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.blueGrey.shade600,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    Expanded(
                                      child: OutlinedButton(
                                        onPressed: (_canPickup(orderId, status) && !isBusy)
                                            ? () => _markPickedUp(orderId)
                                            : null,
                                        child: Text(isBusy ? 'Working...' : 'Pickup'),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: ElevatedButton(
                                        onPressed: (_canDeliver(orderId, status) && !isBusy)
                                            ? () => _markDelivered(orderId)
                                            : null,
                                        child: Text(isBusy ? 'Working...' : 'Deliver'),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
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
                      'Active Ride Plan',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                    ),
                    const SizedBox(height: 12),
                    if (!_hasActiveRide)
                      const Text('No active ride')
                    else if (recommendedStops.isEmpty)
                      const Text('No route plan stops yet')
                    else
                      ...recommendedStops.take(8).map((stop) {
                        final seq = stop['sequence']?.toString() ?? '-';
                        final type = _formatStopType(stop['type']?.toString() ?? 'dropoff');
                        final orderRef = stop['orderRef']?.toString() ?? '-';
                        final orderId = stop['orderId']?.toString() ?? '';
                        final status = stop['status']?.toString() ?? '-';
                        final isNext = _nextActionableOrderId == orderId &&
                            _nextActionableStop?['type']?.toString() ==
                                stop['type']?.toString();

                        double? stopDistance;
                        final lat = (stop['lat'] as num?)?.toDouble();
                        final lng = (stop['lng'] as num?)?.toDouble();
                        if (_lastPosition != null && lat != null && lng != null) {
                          stopDistance = _calculateDistanceMeters(
                            _lastPosition!.latitude,
                            _lastPosition!.longitude,
                            lat,
                            lng,
                          );
                        }

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isNext ? Colors.green.shade50 : Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isNext ? Colors.green.shade300 : Colors.transparent,
                              ),
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 14,
                                  child: Text(seq),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '$type • $orderRef',
                                        style: const TextStyle(fontWeight: FontWeight.w600),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Status: $status',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.blueGrey.shade600,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Distance: ${_formatDistance(stopDistance)}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.blueGrey.shade600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (isNext)
                                  const Text(
                                    'NEXT STOP',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.green,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        );
                      }),
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
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                    ),
                    const SizedBox(height: 12),
                    _InfoRow(label: 'Accel Y raw', value: _accelY.toStringAsFixed(2)),
                    _InfoRow(label: 'Accel Y filtered', value: _filteredAccelY.toStringAsFixed(2)),
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