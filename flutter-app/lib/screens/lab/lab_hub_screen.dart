import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../services/lab_api_service.dart';
import '../../services/emr_api_service.dart';
import '../../main.dart';
import '../../utils/theme.dart';
import '../../widgets/health_bridge_footer.dart';
import 'my_bookings_screen.dart';
import 'booking_tracking_screen.dart';

class LabHubScreen extends StatefulWidget {
  const LabHubScreen({super.key});
  @override
  State<LabHubScreen> createState() => _LabHubScreenState();
}

class _LabHubScreenState extends State<LabHubScreen> {
  int _totalBookings = 0;
  int _pendingCount = 0;
  int _activeCount = 0;
  int _resultsReadyCount = 0;
  List<LabBooking> _recentBookings = [];
  bool _loading = true;
  bool _isLoggedIn = false;
  String _userName = 'Patient';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final user = await AuthService.getUser();
      final hasAuthState = (AuthState.token != null && AuthState.token!.isNotEmpty) ||
          (AuthState.userId != null && AuthState.userId!.isNotEmpty);
      final loggedIn = (user != null) || hasAuthState || AppSession.isLoggedIn;

      final rawName = (user != null && user.name.isNotEmpty)
          ? user.name
          : (AuthState.name?.isNotEmpty == true
              ? AuthState.name!
              : (AppSession.userName?.isNotEmpty == true ? AppSession.userName! : 'Patient'));
      final userId = (user != null && user.userId.isNotEmpty)
          ? user.userId
          : (AuthState.userId ?? '');

      if (mounted) {
        setState(() {
          _isLoggedIn = loggedIn;
          _userName = loggedIn ? rawName.split(' ').first : 'Guest';
        });
      }

      if (!loggedIn || userId.isEmpty) {
        if (mounted) {
          setState(() {
            _loading = false;
            _recentBookings = [];
            _totalBookings = 0;
            _pendingCount = 0;
            _activeCount = 0;
            _resultsReadyCount = 0;
          });
        }
        return;
      }

      final bookings = await LabApiService.getMyBookings(userId)
          .timeout(const Duration(seconds: 5), onTimeout: () => []);
      if (mounted) {
        setState(() {
          _recentBookings = bookings;
          _totalBookings = bookings.length;
          _pendingCount = bookings.where((b) =>
            b.status == 'PendingLabApproval' ||
            b.status == 'PendingPrescriptionUpload' ||
            b.status == 'PendingAIVerification'
          ).length;
          _activeCount = bookings.where((b) => 
            b.status == 'Confirmed' || 
            b.status == 'SampleCollected' || 
            b.status == 'TestingInProgress'
          ).length;
          _resultsReadyCount = bookings.where((b) => 
            b.status == 'ResultsReady' || 
            b.status == 'ReportDelivered' || 
            b.status == 'Completed' ||
            (b.resultFileUrl != null && b.resultFileUrl!.isNotEmpty)
          ).length;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _requireLoginAction({required String featureName, required VoidCallback onAuthenticated}) {
    if (_isLoggedIn) {
      onAuthenticated();
    } else {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: kPrimary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.lock_outline, color: kPrimary, size: 22),
              ),
              const SizedBox(width: 12),
              const Text('Login Required', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Text(
            'You need to be logged in to $featureName. Please sign in with your patient account or register to continue.',
            style: const TextStyle(fontSize: 14, color: kTextMuted, height: 1.5),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: kTextMuted, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.pushNamed(context, '/login').then((_) => _loadData());
              },
              icon: const Icon(Icons.login, size: 16),
              label: const Text('Log In / Register'),
              style: ElevatedButton.styleFrom(
                backgroundColor: kPrimary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final latestActive = _recentBookings.where((b) => 
      b.status != 'Completed' && b.status != 'Cancelled' && b.status != 'Rejected'
    ).firstOrNull;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Laboratory Hub'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              setState(() => _loading = true);
              _loadData();
            },
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: kPrimary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Hero Laboratory Banner
              FadeSlideAnimation(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    gradient: const LinearGradient(
                      colors: [Color(0xFF004D40), Color(0xFF00796B), Color(0xFF00897B)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: kPrimaryDark.withValues(alpha: 0.3),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                PulsingLiveDot(color: Color(0xFF34D399)),
                                SizedBox(width: 6),
                                Text(
                                  'AI Clinical Diagnostics',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.science, color: Colors.white70, size: 22),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Text(
                        _isLoggedIn ? 'Hello, $_userName 👋' : 'Clinical Diagnostics & Labs 🔬',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _isLoggedIn
                            ? 'Book lab tests, track sample analysis live, and download verified digital medical reports.'
                            : 'Explore 50+ accredited pathology & diagnostic tests with transparent pricing.',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.9),
                          fontSize: 13,
                          height: 1.4,
                        ),
                      ),
                      if (!_isLoggedIn) ...[
                        const SizedBox(height: 14),
                        ElevatedButton.icon(
                          onPressed: () => Navigator.pushNamed(context, '/catalogue'),
                          icon: const Icon(Icons.search, size: 16, color: kPrimaryDark),
                          label: const Text('Explore Lab Tests', style: TextStyle(color: kPrimaryDark, fontWeight: FontWeight.bold, fontSize: 13)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              // Summary Stats Counters - ONLY VISIBLE FOR LOGGED IN PATIENTS
              if (_isLoggedIn) ...[
                const SizedBox(height: 20),
                const Text(
                  'Diagnostic Overview',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: kText),
                ),
                const SizedBox(height: 10),

                _loading
                    ? const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator(color: kPrimary)))
                    : Row(
                        children: [
                          _StatCard(
                            count: _totalBookings,
                            label: 'Total',
                            color: kPrimary,
                            icon: Icons.folder_outlined,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const MyBookingsScreen(statusFilter: 'ALL')),
                            ),
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            count: _pendingCount,
                            label: 'Pending',
                            color: kWarning,
                            icon: Icons.hourglass_top_outlined,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const MyBookingsScreen(statusFilter: 'ACTIVE')),
                            ),
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            count: _activeCount,
                            label: 'Active',
                            color: const Color(0xFF2563EB),
                            icon: Icons.biotech_outlined,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const MyBookingsScreen(statusFilter: 'ACTIVE')),
                            ),
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            count: _resultsReadyCount,
                            label: 'Reports',
                            color: const Color(0xFF10B981),
                            icon: Icons.task_alt_outlined,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const MyBookingsScreen(statusFilter: 'RESULTS')),
                            ),
                          ),
                        ],
                      ),

                // Live Tracking Card for active booking
                if (latestActive != null) ...[
                  const SizedBox(height: 20),
                  FadeSlideAnimation(
                    child: AppCard(
                      color: const Color(0xFFF8FAFC),
                      border: Border.all(color: kPrimary.withValues(alpha: 0.3), width: 1.2),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => BookingTrackingScreen(booking: latestActive)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(colors: [kPrimary, Color(0xFF00BCD4)]),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.track_changes, color: Colors.white, size: 22),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Text('Active Test: ', style: TextStyle(fontSize: 11, color: kTextMuted, fontWeight: FontWeight.w600)),
                                    Expanded(
                                      child: Text(
                                        latestActive.labTest?.name ?? 'Lab Test',
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kText),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                StatusBadge(status: latestActive.status),
                              ],
                            ),
                          ),
                          const Icon(Icons.arrow_forward_ios, size: 14, color: kPrimary),
                        ],
                      ),
                    ),
                  ),
                ],
              ],

              const SizedBox(height: 24),

              // Action Cards Section
              const Text(
                'Laboratory Services',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: kText),
              ),
              const SizedBox(height: 12),

              // 1. Book Laboratory Test (Requires logged-in user)
              _ActionCard(
                icon: Icons.add_circle_outline,
                title: 'Book Laboratory Test',
                description: 'Schedule a slot, upload doctor prescription, and reserve online.',
                gradient: const [Color(0xFF0F766E), Color(0xFF14B8A6)],
                badgeText: 'Instant Booking',
                onTap: () => _requireLoginAction(
                  featureName: 'book a laboratory test',
                  onAuthenticated: () => Navigator.pushNamed(context, '/catalogue'),
                ),
              ),
              const SizedBox(height: 12),

              // 2. Track Specimen & Status (Requires logged-in user)
              _ActionCard(
                icon: Icons.track_changes_outlined,
                title: 'Track Specimen & Status',
                description: 'Follow sample collection, testing analysis, and report ETA.',
                gradient: const [Color(0xFF1565C0), Color(0xFF3B82F6)],
                badgeText: (_isLoggedIn && _activeCount > 0) ? '$_activeCount Active' : null,
                onTap: () => _requireLoginAction(
                  featureName: 'track your specimen and test progress',
                  onAuthenticated: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const MyBookingsScreen(statusFilter: 'ACTIVE')),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // 3. Download Test Reports (Requires logged-in user)
              _ActionCard(
                icon: Icons.file_download_done_outlined,
                title: 'Download Test Reports',
                description: 'View and download physician-verified PDF laboratory results.',
                gradient: const [Color(0xFF059669), Color(0xFF10B981)],
                badgeText: (_isLoggedIn && _resultsReadyCount > 0) ? '$_resultsReadyCount Ready' : null,
                onTap: () => _requireLoginAction(
                  featureName: 'download your medical test reports',
                  onAuthenticated: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const MyBookingsScreen(statusFilter: 'RESULTS')),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // 4. Full Booking History (Requires logged-in user)
              _ActionCard(
                icon: Icons.receipt_long_outlined,
                title: 'Full Booking History',
                description: 'Past diagnostics, digital prescriptions, and 1-tap test reordering.',
                gradient: const [Color(0xFFD97706), Color(0xFFF59E0B)],
                onTap: () => _requireLoginAction(
                  featureName: 'view your full lab test history',
                  onAuthenticated: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const MyBookingsScreen(statusFilter: 'HISTORY')),
                  ),
                ),
              ),

              const SizedBox(height: 20),
              const HealthBridgeFooter(),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final int count;
  final String label;
  final Color color;
  final IconData icon;
  final VoidCallback? onTap;

  const _StatCard({
    required this.count,
    required this.label,
    required this.color,
    required this.icon,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: AppCard(
        onTap: onTap,
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
        child: Column(
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(height: 6),
            Text(
              '$count',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: color),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(fontSize: 10.5, color: kTextMuted, fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final List<Color> gradient;
  final String? badgeText;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.gradient,
    this.badgeText,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: gradient,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: gradient[0].withValues(alpha: 0.3),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: Colors.white, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          title,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                            color: Colors.white,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (badgeText != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            badgeText!,
                            style: TextStyle(
                              color: gradient[0],
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    description,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.88),
                      fontSize: 12,
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(Icons.arrow_forward_ios, color: Colors.white.withValues(alpha: 0.7), size: 14),
          ],
        ),
      ),
    );
  }
}
