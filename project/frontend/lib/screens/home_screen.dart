import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../main.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import '../widgets/widgets.dart';
import 'send_screen.dart';
import 'cashout_screen.dart';
import 'activity_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<WalletModel> _wallets = [];
  int _selectedWalletIdx = 0;
  String _avaxBalance = '0.00';
  bool _loading = true;
  bool _refreshing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiService.getWallets();
      final wallets = (res['wallets'] as List)
          .map((w) => WalletModel.fromJson(w as Map<String, dynamic>))
          .toList();

      if (wallets.isEmpty) {
        setState(() { _loading = false; _error = 'No demo wallets yet. Tap seed to create.'; });
        return;
      }

      setState(() { _wallets = wallets; _loading = false; });
      _refreshBalance();
    } catch (e) {
      setState(() { _loading = false; _error = e.toString(); });
    }
  }

  Future<void> _refreshBalance() async {
    if (_wallets.isEmpty) return;
    setState(() => _refreshing = true);
    try {
      final addr = _wallets[_selectedWalletIdx].address;
      final res = await ApiService.getBalance(addr);
      setState(() {
        _avaxBalance = double.parse(res['avax'] as String? ?? '0').toStringAsFixed(4);
        // Update USDC too
        final idx = _selectedWalletIdx;
        if (idx < _wallets.length) {
          _wallets[idx] = WalletModel(
            address: _wallets[idx].address,
            label: _wallets[idx].label,
            kycVerified: _wallets[idx].kycVerified,
            usdcBalance: (res['usdc'] as String?) ?? _wallets[idx].usdcBalance,
            createdAt: _wallets[idx].createdAt,
          );
        }
      });
    } catch (_) {}
    setState(() => _refreshing = false);
  }

  Future<void> _seed() async {
    setState(() => _loading = true);
    try {
      await ApiService.seed();
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Demo wallets seeded! KYC each wallet to enable transfers.'), backgroundColor: AppTheme.success),
        );
      }
    } catch (e) {
      setState(() { _loading = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.secondary,
      body: SafeArea(
        child: Column(
          children: [
            const NexPayHeader(),
            Expanded(
              child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.accent))
                : _error != null && _wallets.isEmpty
                  ? _buildError()
                  : _buildContent(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: AppTheme.error, size: 48),
            const SizedBox(height: 16),
            Text(_error ?? 'Error', textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70)),
            const SizedBox(height: 24),
            ElevatedButton(onPressed: _seed, child: const Text('Seed Demo Wallets')),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    final wallet = _wallets.isNotEmpty ? _wallets[_selectedWalletIdx] : null;
    return RefreshIndicator(
      onRefresh: () async { await _refreshBalance(); },
      color: AppTheme.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 8),
            if (wallet != null)
              WalletCard(
                address: wallet.address,
                label: wallet.label,
                usdc: double.tryParse(wallet.usdcBalance)?.toStringAsFixed(2) ?? '0.00',
                avax: _avaxBalance,
                kyc: wallet.kycVerified,
              ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.1, end: 0),
            const SizedBox(height: 20),
            // Wallet selector
            if (_wallets.length > 1) ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text('Demo Wallets', style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 48,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _wallets.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (ctx, i) {
                    final w = _wallets[i];
                    final selected = i == _selectedWalletIdx;
                    return GestureDetector(
                      onTap: () {
                        setState(() => _selectedWalletIdx = i);
                        _refreshBalance();
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        decoration: BoxDecoration(
                          color: selected ? AppTheme.primary : Colors.white.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: selected ? AppTheme.primary : Colors.transparent),
                        ),
                        child: Center(
                          child: Row(
                            children: [
                              if (w.kycVerified)
                                const Padding(
                                  padding: EdgeInsets.only(right: 4),
                                  child: Icon(Icons.verified_rounded, color: AppTheme.accent, size: 13),
                                ),
                              Text(w.label.split(' ').first, style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: selected ? FontWeight.w600 : FontWeight.w400)),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
            ],
            // Action buttons
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Column(
                children: [
                  _ActionButton(
                    icon: Icons.send_rounded,
                    label: 'Send Instantly',
                    subtitle: '~1 sec on Avalanche',
                    color: AppTheme.primary,
                    onTap: wallet != null ? () => Navigator.pushNamed(context, '/send', arguments: {'wallet': wallet, 'wallets': _wallets}) : null,
                  ).animate().fadeIn(delay: 100.ms),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _SmallActionButton(
                          icon: Icons.account_balance_rounded,
                          label: 'Cash Out',
                          subtitle: 'to bank via partner',
                          color: AppTheme.accent,
                          onTap: wallet != null ? () => Navigator.pushNamed(context, '/cashout', arguments: {'wallet': wallet}) : null,
                        ).animate().fadeIn(delay: 150.ms),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _SmallActionButton(
                          icon: Icons.history_rounded,
                          label: 'Activity',
                          subtitle: 'view all transactions',
                          color: AppTheme.neutral,
                          onTap: wallet != null ? () => Navigator.pushNamed(context, '/activity', arguments: {'address': wallet.address}) : null,
                        ).animate().fadeIn(delay: 200.ms),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            // Network info card
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.04),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.06)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 8, height: 8,
                        decoration: const BoxDecoration(color: AppTheme.avalancheRed, shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 8),
                      const Text('Network Stats', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _StatRow('Chain', 'Avalanche C-Chain (Fuji)'),
                  _StatRow('Token', 'USDC (0x5425...1Bc65)'),
                  _StatRow('Finality', '< 2 seconds'),
                  _StatRow('Gas Cost', '~0.001 AVAX'),
                  _StatRow('Compliance', 'PersonalRemittance / BusinessPayment'),
                ],
              ),
            ).animate().fadeIn(delay: 250.ms),
            const SizedBox(height: 20),
            // KYC / Admin section
            if (wallet != null && !wallet.kycVerified)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.warning.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.warning.withOpacity(0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded, color: AppTheme.warning, size: 18),
                        const SizedBox(width: 8),
                        const Text('KYC Required', style: TextStyle(color: AppTheme.warning, fontWeight: FontWeight.w600)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'This wallet needs KYC verification before transfers. This is a demo — tap below to verify.',
                      style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 40,
                      child: ElevatedButton(
                        onPressed: () => _verifyKyc(wallet.address),
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.warning),
                        child: const Text('Verify KYC (Demo)', style: TextStyle(fontSize: 13)),
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 300.ms),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Future<void> _verifyKyc(String address) async {
    try {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Submitting KYC to contract...'), duration: Duration(seconds: 30)),
      );
      await ApiService.verifyKyc(address);
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('KYC verified!'), backgroundColor: AppTheme.success),
      );
      await _load();
    } catch (e) {
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('KYC error: $e'), backgroundColor: AppTheme.error),
      );
    }
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final Color color;
  final VoidCallback? onTap;

  const _ActionButton({required this.icon, required this.label, required this.subtitle, required this.color, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [BoxShadow(color: color.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Row(
          children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: Colors.white, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
                  Text(subtitle, style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white54, size: 16),
          ],
        ),
      ),
    );
  }
}

class _SmallActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final Color color;
  final VoidCallback? onTap;

  const _SmallActionButton({required this.icon, required this.label, required this.subtitle, required this.color, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 6),
            Text(label, style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w600)),
            Text(subtitle, style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 10), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  final String label;
  final String value;
  const _StatRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Text('$label  ', style: const TextStyle(color: Colors.white38, fontSize: 12)),
          Expanded(child: Text(value, style: const TextStyle(color: Colors.white60, fontSize: 12), textAlign: TextAlign.right)),
        ],
      ),
    );
  }
}
