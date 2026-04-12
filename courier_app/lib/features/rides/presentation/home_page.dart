import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/courier_presence_api.dart';
import '../data/orders_api.dart';

class HomePage extends StatefulWidget {
  final String courierId;

  const HomePage({
    super.key,
    required this.courierId,
  });

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with WidgetsBindingObserver {
  final OrdersApi _ordersApi = OrdersApi();
  final CourierPresenceApi _presenceApi = CourierPresenceApi();
  final TextEditingController _deliveryNoteController = TextEditingController();

  Map<String, dynamic>? _nextStop;
  List<Map<String, dynamic>> _assignedOrders = [];

  bool _loadingNextStop = false;
  bool _loadingOrders = false;
  bool _pickingUp = false;
  bool _delivering = false;

  Timer? _heartbeatTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _bootstrap();
    _startHeartbeat();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _heartbeatTimer?.cancel();
    unawaited(_presenceApi.setOffline(widget.courierId));
    _deliveryNoteController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _bootstrap();
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached) {
      unawaited(_presenceApi.setOffline(widget.courierId));
    }
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();

    _heartbeatTimer = Timer.periodic(const Duration(seconds: 20), (_) async {
      try {
        await _presenceApi.heartbeat(widget.courierId);
      } catch (e) {
        debugPrint('Heartbeat failed: $e');
      }
    });
  }

  Future<void> _bootstrap() async {
    await _ensureLocationPermission();

    try {
      await _presenceApi.heartbeat(widget.courierId);
    } catch (e) {
      debugPrint('Initial heartbeat failed: $e');
    }

    await _loadAssignedOrders();
    await _loadNextStop();
  }

  Future<void> _ensureLocationPermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _showMessage('Konum servisleri kapalı.');
      return;
    }

    var permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied) {
      _showMessage('Konum izni reddedildi.');
      return;
    }

    if (permission == LocationPermission.deniedForever) {
      _showMessage('Konum izni kalıcı reddedildi. Ayarlardan açmalısın.');
      return;
    }
  }

  Future<void> _loadAssignedOrders() async {
    setState(() => _loadingOrders = true);

    try {
      final result = await _ordersApi.getAssignedOrders(widget.courierId);
      final items = result['items'];

      setState(() {
        _assignedOrders = items is List
            ? items
                .whereType<Map>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList()
            : [];
      });
    } catch (e) {
      debugPrint('Failed to load assigned orders: $e');
      setState(() {
        _assignedOrders = [];
      });
    } finally {
      if (mounted) {
        setState(() => _loadingOrders = false);
      }
    }
  }

  Future<void> _loadNextStop() async {
    setState(() => _loadingNextStop = true);

    try {
      final result = await _ordersApi.getNextStop(widget.courierId);
      setState(() {
        _nextStop = result;
      });
    } catch (e) {
      debugPrint('Failed to load next stop: $e');
      setState(() {
        _nextStop = null;
      });
    } finally {
      if (mounted) {
        setState(() => _loadingNextStop = false);
      }
    }
  }

  Future<void> _pickupOrder() async {
    final orderId = _nextStop?['orderId']?.toString();

    if (orderId == null || orderId.isEmpty) {
      _showMessage('Pickup yapılacak sipariş bulunamadı.');
      return;
    }

    if ((_nextStop?['type']?.toString() ?? '') != 'pickup') {
      _showMessage('Şu an pickup aşamasında bir stop yok.');
      return;
    }

    setState(() => _pickingUp = true);

    try {
      final result = await _ordersApi.pickupOrder(orderId);
      await _presenceApi.setBusy(widget.courierId);

      final pickedUpCount = result['pickedUpCount'];

      _showMessage(
        pickedUpCount != null
            ? 'Pickup başarılı. $pickedUpCount order alındı.'
            : 'Pickup başarılı.',
      );

      await _bootstrap();
    } catch (e) {
      debugPrint('Pickup failed: $e');
      _showMessage('Pickup işlemi başarısız oldu.');
    } finally {
      if (mounted) {
        setState(() => _pickingUp = false);
      }
    }
  }

  Future<void> _completeDelivery() async {
    final orderId = _nextStop?['orderId']?.toString();

    if (orderId == null || orderId.isEmpty) {
      _showMessage('Teslim edilecek sipariş bulunamadı.');
      return;
    }

    if ((_nextStop?['type']?.toString() ?? '') != 'dropoff') {
      _showMessage('Önce pickup yapılmalı.');
      return;
    }

    setState(() => _delivering = true);

    try {
      await _ordersApi.deliverOrder(
        orderId,
        note: _deliveryNoteController.text.trim(),
      );

      _deliveryNoteController.clear();
      _showMessage('Teslimat kaydedildi.');

      await _bootstrap();
    } catch (e) {
      debugPrint('Delivery failed: $e');
      _showMessage('Teslimat kaydedilemedi.');
    } finally {
      if (mounted) {
        setState(() => _delivering = false);
      }
    }
  }

  Future<void> _openNavigation() async {
    final rideId = _nextStop?['rideId']?.toString();
    final lat = _nextStop?['lat'];
    final lng = _nextStop?['lng'];

    if (rideId == null || rideId.isEmpty) {
      if (lat == null || lng == null) {
        _showMessage('Yönlendirme için stop bulunamadı.');
        return;
      }

      final fallbackUrl = Uri.parse(
        'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng',
      );

      if (await canLaunchUrl(fallbackUrl)) {
        await launchUrl(fallbackUrl, mode: LaunchMode.externalApplication);
        return;
      }

      _showMessage('Harita uygulaması açılamadı.');
      return;
    }

    try {
      final ridePlan = await _ordersApi.getRidePlan(rideId);
      final sequenceRaw =
          ridePlan['recommendedSequence'] ?? ridePlan['stops'] ?? [];

      final sequence = sequenceRaw is List
          ? sequenceRaw
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList()
          : <Map<String, dynamic>>[];

      if (sequence.isEmpty) {
        _showMessage('Rota bulunamadı.');
        return;
      }

      final destination = sequence.first;
      final destinationLat = destination['lat'];
      final destinationLng = destination['lng'];

      if (destinationLat == null || destinationLng == null) {
        _showMessage('İlk stop koordinatı eksik.');
        return;
      }

      final remaining =
          sequence.length > 1 ? sequence.sublist(1) : <Map<String, dynamic>>[];

      final waypointPoints = remaining
          .map((stop) => '${stop['lat']},${stop['lng']}')
          .where((value) => !value.contains('null'))
          .take(8)
          .join('|');

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      final origin = '${position.latitude},${position.longitude}';
      final destinationPoint = '$destinationLat,$destinationLng';

      final googleMapsUrl = Uri.parse(
        waypointPoints.isNotEmpty
            ? 'https://www.google.com/maps/dir/?api=1&origin=$origin&destination=$destinationPoint&waypoints=$waypointPoints&travelmode=driving'
            : 'https://www.google.com/maps/dir/?api=1&origin=$origin&destination=$destinationPoint&travelmode=driving',
      );

      if (await canLaunchUrl(googleMapsUrl)) {
        await launchUrl(googleMapsUrl, mode: LaunchMode.externalApplication);
        return;
      }

      _showMessage('Harita uygulaması açılamadı.');
    } catch (e) {
      debugPrint('Navigation failed: $e');
      _showMessage('Yönlendirme açılamadı.');
    }
  }

  void _showMessage(String text) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(text)),
    );
  }

  String _formatAvailability(String? status) {
    switch (status) {
      case 'READY':
        return 'READY';
      case 'DELIVERY':
        return 'BUSY';
      case 'OFFLINE':
        return 'OFFLINE';
      default:
        return status ?? '-';
    }
  }

  Color _statusColor(String? type) {
    if (type == 'pickup') return Colors.orange;
    if (type == 'dropoff') return Colors.green;
    return Colors.blueGrey;
  }

  @override
  Widget build(BuildContext context) {
    final nextStopType = _nextStop?['type']?.toString() ?? '-';
    final nextStopOrder = _nextStop?['externalRef']?.toString() ??
        _nextStop?['orderId']?.toString() ??
        '-';
    final nextStopLat = _nextStop?['lat']?.toString() ?? '-';
    final nextStopLng = _nextStop?['lng']?.toString() ?? '-';
    final nextStopSource = _nextStop?['source']?.toString() ?? '-';
    final nextStopSequence = _nextStop?['sequence']?.toString() ?? '-';
    final remainingStopCount =
        _nextStop?['remainingStopCount']?.toString() ?? '-';
    final availability =
        _formatAvailability(_nextStop?['availabilityStatus']?.toString());
    final stopLabel = _nextStop?['stopLabel']?.toString() ?? 'Next Stop';

    final groupedOrdersRaw = _nextStop?['groupedOrders'];
    final groupedOrders = groupedOrdersRaw is List
        ? groupedOrdersRaw
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList()
        : <Map<String, dynamic>>[];

    final groupedOrderCount = _nextStop?['groupedOrderCount']?.toString() ??
        groupedOrders.length.toString();

    final isPickup = nextStopType == 'pickup';
    final isDropoff = nextStopType == 'dropoff';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Courier App'),
        actions: [
          IconButton(
            onPressed: _bootstrap,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _bootstrap,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: _loadingNextStop
                    ? const SizedBox(
                        height: 180,
                        child: Center(child: CircularProgressIndicator()),
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
  children: [
    Expanded(
      child: OutlinedButton.icon(
        onPressed: () async {
          try {
            await _presenceApi.setReady(widget.courierId);
            _showMessage('Ready for Pickup aktif.');
            await _bootstrap();
          } catch (e) {
            _showMessage('Ready durumu güncellenemedi.');
          }
        },
        icon: const Icon(Icons.play_circle_outline),
        label: const Text('Ready for Pickup'),
      ),
    ),
    const SizedBox(width: 10),
    Expanded(
      child: OutlinedButton.icon(
        onPressed: () async {
          try {
            await _presenceApi.setOffline(widget.courierId);
            _showMessage('Offline / pause aktif.');
            await _bootstrap();
          } catch (e) {
            _showMessage('Durum güncellenemedi.');
          }
        },
        icon: const Icon(Icons.pause_circle_outline),
        label: const Text('Pause / Offline'),
      ),
    ),
  ],
),
const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  stopLabel,
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: _statusColor(nextStopType)
                                      .withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  nextStopType.toUpperCase(),
                                  style: TextStyle(
                                    color: _statusColor(nextStopType),
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text('Primary Order: $nextStopOrder'),
                          const SizedBox(height: 4),
                          Text('Availability: $availability'),
                          Text('Sequence: $nextStopSequence'),
                          Text('Remaining Stops: $remainingStopCount'),
                          Text('Orders at Stop: $groupedOrderCount'),
                          Text('Lat: $nextStopLat'),
                          Text('Lng: $nextStopLng'),
                          Text('Source: $nextStopSource'),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: _openNavigation,
                              icon: const Icon(Icons.navigation),
                              label: const Text('Open Route Navigation'),
                            ),
                          ),
                          const SizedBox(height: 10),
                          if (isPickup)
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                onPressed:
                                    !_pickingUp ? _pickupOrder : null,
                                icon: const Icon(Icons.inventory_2),
                                label: Text(
                                  _pickingUp ? 'Picking up...' : 'Pickup All',
                                ),
                              ),
                            ),
                          if (isDropoff) ...[
                            const SizedBox(height: 10),
                            TextField(
                              controller: _deliveryNoteController,
                              maxLines: 3,
                              decoration: const InputDecoration(
                                hintText: 'Teslimat notu gir...',
                                border: OutlineInputBorder(),
                              ),
                            ),

                            Row(
  children: [
const SizedBox(height: 10),
                            const SizedBox(height: 10),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                onPressed:
                                    !_delivering ? _completeDelivery : null,
                                icon: const Icon(Icons.check_circle),
                                label: Text(
                                  _delivering
                                      ? 'Saving...'
                                      : 'Complete Delivery',
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              elevation: 1,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Orders at This Stop',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (groupedOrders.isEmpty)
                      const Text('Bu stop için order bulunamadı.')
                    else
                      ...groupedOrders.map(
                        (order) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${order['externalRef'] ?? order['id']}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text('Status: ${order['status'] ?? '-'}'),
                                Text(
                                  'Pickup: ${order['pickupAddress'] ?? '-'}',
                                ),
                                Text(
                                  'Dropoff: ${order['dropoffAddress'] ?? '-'}',
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              elevation: 1,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: _loadingOrders
                    ? const Center(child: CircularProgressIndicator())
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'All Assigned Orders',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 12),
                          if (_assignedOrders.isEmpty)
                            const Text('Assigned order bulunamadı.')
                          else
                            ..._assignedOrders.map(
                              (order) => Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.grey.shade50,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: Colors.grey.shade300,
                                    ),
                                  ),
                                  child: Text(
                                    '${order['externalRef'] ?? order['id']} · ${order['status']}',
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}