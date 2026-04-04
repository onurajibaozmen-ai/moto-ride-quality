import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class RideMiniMap extends StatelessWidget {
  final double? courierLat;
  final double? courierLng;
  final List<Map<String, dynamic>> stops;
  final String? nextOrderId;
  final String? nextStopType;

  const RideMiniMap({
    super.key,
    required this.courierLat,
    required this.courierLng,
    required this.stops,
    required this.nextOrderId,
    required this.nextStopType,
  });

  LatLng _fallbackCenter() {
    if (stops.isNotEmpty) {
      final first = stops.first;
      final lat = (first['lat'] as num?)?.toDouble();
      final lng = (first['lng'] as num?)?.toDouble();
      if (lat != null && lng != null) {
        return LatLng(lat, lng);
      }
    }

    if (courierLat != null && courierLng != null) {
      return LatLng(courierLat!, courierLng!);
    }

    return const LatLng(41.0082, 28.9784);
  }

  List<LatLng> _polylinePoints() {
    final points = <LatLng>[];

    for (final stop in stops) {
      final lat = (stop['lat'] as num?)?.toDouble();
      final lng = (stop['lng'] as num?)?.toDouble();
      if (lat != null && lng != null) {
        points.add(LatLng(lat, lng));
      }
    }

    return points;
  }

  Color _stopColor(String type, bool isNext) {
    if (isNext) return Colors.green;
    if (type == 'pickup') return Colors.blue;
    return Colors.deepOrange;
  }

  @override
  Widget build(BuildContext context) {
    final center = _fallbackCenter();
    final routePoints = _polylinePoints();

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        height: 260,
        child: FlutterMap(
          options: MapOptions(
            initialCenter: center,
            initialZoom: 14,
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'courier_app',
            ),
            if (routePoints.length >= 2)
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: routePoints,
                    strokeWidth: 4,
                    color: Colors.black87,
                  ),
                ],
              ),
            MarkerLayer(
              markers: [
                if (courierLat != null && courierLng != null)
                  Marker(
                    point: LatLng(courierLat!, courierLng!),
                    width: 40,
                    height: 40,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 3),
                      ),
                      child: const Icon(
                        Icons.delivery_dining,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                  ),
                ...stops.map((stop) {
                  final lat = (stop['lat'] as num?)?.toDouble();
                  final lng = (stop['lng'] as num?)?.toDouble();
                  final seq = stop['sequence']?.toString() ?? '-';
                  final type = stop['type']?.toString() ?? 'dropoff';
                  final orderId = stop['orderId']?.toString();
                  final stopType = stop['type']?.toString();
                  final isNext = orderId == nextOrderId && stopType == nextStopType;

                  if (lat == null || lng == null) {
                    return Marker(
                      point: center,
                      width: 0,
                      height: 0,
                      child: const SizedBox.shrink(),
                    );
                  }

                  return Marker(
                    point: LatLng(lat, lng),
                    width: 38,
                    height: 38,
                    child: Container(
                      decoration: BoxDecoration(
                        color: _stopColor(type, isNext),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                        boxShadow: const [
                          BoxShadow(
                            blurRadius: 6,
                            color: Colors.black26,
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          seq,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ],
            ),
          ],
        ),
      ),
    );
  }
}