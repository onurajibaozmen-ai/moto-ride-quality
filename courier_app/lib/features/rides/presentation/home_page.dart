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
      await _ordersApi.pickupOrder(orderId);
      await _presenceApi.setBusy(widget.courierId);
      _showMessage('Pickup başarılı.');
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
    final lat = _nextStop?['lat'];
    final lng = _nextStop?['lng'];

    if (lat == null || lng == null) {
      _showMessage('Yönlendirme için stop bulunamadı.');
      return;
    }

    final googleMapsUrl = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng',
    );

    final geoUrl = Uri.parse('geo:$lat,$lng');

    try {
      if (await canLaunchUrl(googleMapsUrl)) {
        await launchUrl(googleMapsUrl, mode: LaunchMode.externalApplication);
        return;
      }

      if (await canLaunchUrl(geoUrl)) {
        await launchUrl(geoUrl, mode: LaunchMode.externalApplication);
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

    final isPickup = nextStopType == 'pickup';
    final isDropoff = nextStopType == 'dropoff';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Courier App'),
      ),
      body: RefreshIndicator(
        onRefresh: _bootstrap,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: _loadingOrders
                    ? const Center(child: CircularProgressIndicator())
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Assigned Orders',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 12),
                          if (_assignedOrders.isEmpty)
                            const Text('Assigned order bulunamadı.')
                          else
                            ..._assignedOrders.map(
                              (order) => Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Text(
                                  '${order['externalRef'] ?? order['id']} · ${order['status']}',
                                ),
                              ),
                            ),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: _loadingNextStop
                    ? const Center(child: CircularProgressIndicator())
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Next Stop',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text('Order: $nextStopOrder'),
                          Text('Type: $nextStopType'),
                          Text('Availability: $availability'),
                          Text('Sequence: $nextStopSequence'),
                          Text('Remaining Stops: $remainingStopCount'),
                          Text('Lat: $nextStopLat'),
                          Text('Lng: $nextStopLng'),
                          Text('Source: $nextStopSource'),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _openNavigation,
                              child: const Text('Open Navigation'),
                            ),
                          ),
                          const SizedBox(height: 8),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: isPickup && !_pickingUp
                                  ? _pickupOrder
                                  : null,
                              child: Text(
                                _pickingUp ? 'Picking up...' : 'Pickup Order',
                              ),
                            ),
                          ),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Delivery Note',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _deliveryNoteController,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        hintText: 'Teslimat notu gir...',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: isDropoff && !_delivering
                            ? _completeDelivery
                            : null,
                        child: Text(
                          _delivering ? 'Saving...' : 'Complete Delivery',
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