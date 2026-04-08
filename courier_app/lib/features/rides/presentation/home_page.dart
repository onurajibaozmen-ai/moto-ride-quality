import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_client.dart';
import '../data/orders_api.dart';
import '../data/telemetry_api.dart';
import '../data/telemetry_queue.dart';

class HomePage extends StatefulWidget {
  final String courierId;
  final String? activeRideId;

  const HomePage({
    super.key,
    required this.courierId,
    this.activeRideId,
  });

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late final OrdersApi _ordersApi;
  late final TelemetryApi _telemetryApi;
  late final TelemetryQueue _telemetryQueue;

  final TextEditingController _deliveryNoteController = TextEditingController();

  Map<String, dynamic>? _nextStop;
  bool _loadingNextStop = false;
  bool _delivering = false;
  Timer? _flushTimer;

  @override
  void initState() {
    super.initState();

    _ordersApi = OrdersApi();
    _telemetryApi = TelemetryApi();
    _telemetryQueue = TelemetryQueue(_telemetryApi);

    _loadNextStop();

    _flushTimer = Timer.periodic(const Duration(seconds: 5), (_) async {
      await _telemetryQueue.flush(
        courierId: widget.courierId,
        rideId: widget.activeRideId,
      );
    });
  }

  @override
  void dispose() {
    _flushTimer?.cancel();
    _deliveryNoteController.dispose();
    super.dispose();
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
    } finally {
      if (mounted) {
        setState(() => _loadingNextStop = false);
      }
    }
  }

  Future<void> _completeDelivery() async {
    final orderId = _nextStop?['orderId']?.toString();

    if (orderId == null || orderId.isEmpty) {
      _showMessage('Teslim edilecek sipariş bulunamadı.');
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
      await _loadNextStop();
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
      _showMessage('Yönlendirme için next stop bulunamadı.');
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

  @override
  Widget build(BuildContext context) {
    final nextStopType = _nextStop?['type']?.toString() ?? '-';
    final nextStopOrder = _nextStop?['externalRef']?.toString() ??
        _nextStop?['orderId']?.toString() ??
        '-';
    final nextStopLat = _nextStop?['lat']?.toString() ?? '-';
    final nextStopLng = _nextStop?['lng']?.toString() ?? '-';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Courier App'),
      ),
      body: RefreshIndicator(
        onRefresh: _loadNextStop,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
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
                          Text('Lat: $nextStopLat'),
                          Text('Lng: $nextStopLng'),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _openNavigation,
                              child: const Text('Open Navigation'),
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
                        onPressed: _delivering ? null : _completeDelivery,
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