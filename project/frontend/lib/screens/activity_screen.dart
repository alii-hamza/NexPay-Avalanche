import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../main.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../widgets/widgets.dart';

class ActivityScreen extends StatefulWidget {
  const ActivityScreen({super.key});

  @override
  State<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends State<ActivityScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<TransferModel> _transfers = [];
  List<CashoutModel> _cashouts = [];
  bool _loading = true;
  String? _error;
  String _address = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments as Map?;
    _address = args?['address'] as String? ?? '';
    if (_address.isNotEmpty) _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.getTransfers(_address);
      setState(() {
        _transfers = (res['transfers'] as List)
            .map((t) => TransferModel.fromJson(t as Map<String, dynamic>))
            .toList();
        _cashouts = (res['cashouts'] as List)
            .map((c) => CashoutModel.fromJson(c as Map<String, dynamic>))
            .toList();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Activity'),
        backgroundColor: AppTheme.secondary,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.accent,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white54,
          tabs: [
            Tab(text: 'Transfers (${_transfers.length})'),
            Tab(text: 'Cashouts (${_cashouts.length})'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: AppTheme.error)))
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _TransfersList(transfers: _transfers, address: _address),
                    _CashoutsList(cashouts: _cashouts),
                  ],
                ),
    );
  }
}

class _TransfersList extends StatelessWidget {
  final List<TransferModel> transfers;
  final String address;

  const _TransfersList({required this.transfers, required this.address});

  @override
  Widget build(BuildContext context) {
    if (transfers.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.swap_horiz_rounded, size: 48, color: AppTheme.neutralLight),
            SizedBox(height: 12),
            Text('No transfers yet', style: TextStyle(color: AppTheme.neutral)),
            Text('Send your first transfer from the home screen', style: TextStyle(color: AppTheme.neutralLight, fontSize: 12)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {},
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: transfers.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (ctx, i) {
          final t = transfers[i];
          final isSent = t.fromAddress.toLowerCase() == address.toLowerCase();
          return _TransferCard(transfer: t, isSent: isSent)
              .animate()
              .fadeIn(delay: Duration(milliseconds: i * 50))
              .slideY(begin: 0.05, end: 0);
        },
      ),
    );
  }
}

class _TransferCard extends StatelessWidget {
  final TransferModel transfer;
  final bool isSent;

  const _TransferCard({required this.transfer, required this.isSent});

  static const _catColors = [AppTheme.primary, AppTheme.accent, AppTheme.neutral];
  static const _catLabels = ['PersonalRemittance', 'BusinessPayment', 'WalletTransfer'];

  @override
  Widget build(BuildContext context) {
    final catIdx = transfer.category.clamp(0, 2);
    final catColor = _catColors[catIdx];
    final amount = double.tryParse(transfer.amount)?.toStringAsFixed(2) ?? transfer.amount;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surfaceWhite,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.neutralLight.withOpacity(0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(
                  color: isSent ? AppTheme.errorLight : AppTheme.successLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  isSent ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded,
                  color: isSent ? AppTheme.error : AppTheme.success,
                  size: 18,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isSent ? 'Sent to ${transfer.shortTo}' : 'Received from ${transfer.shortFrom}',
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                    Text(
                      _formatDate(transfer.createdAt),
                      style: const TextStyle(color: AppTheme.neutral, fontSize: 12),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${isSent ? '-' : '+'}\$$amount',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                      color: isSent ? AppTheme.error : AppTheme.success,
                    ),
                  ),
                  const Text('USDC', style: TextStyle(color: AppTheme.neutral, fontSize: 11)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: catColor.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: catColor.withOpacity(0.2)),
                ),
                child: Text(
                  _catLabels[catIdx],
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: catColor),
                ),
              ),
              const Spacer(),
              StatusBadge(transfer.status),
            ],
          ),
          if (transfer.memo.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text('Memo: ${transfer.memo}', style: const TextStyle(color: AppTheme.neutral, fontSize: 12)),
          ],
          if (transfer.txHash != null && transfer.txHash!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'TX: ${transfer.txHash!.substring(0, 10)}...${transfer.txHash!.substring(transfer.txHash!.length - 6)}',
              style: const TextStyle(color: AppTheme.neutralLight, fontSize: 11, fontFamily: 'monospace'),
            ),
          ],
        ],
      ),
    );
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso).toLocal();
      final months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return '${months[d.month - 1]} ${d.day}, ${d.year} ${d.hour.toString().padLeft(2,'0')}:${d.minute.toString().padLeft(2,'0')}';
    } catch (_) { return iso; }
  }
}

class _CashoutsList extends StatelessWidget {
  final List<CashoutModel> cashouts;
  const _CashoutsList({required this.cashouts});

  @override
  Widget build(BuildContext context) {
    if (cashouts.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.account_balance_rounded, size: 48, color: AppTheme.neutralLight),
            SizedBox(height: 12),
            Text('No cashouts yet', style: TextStyle(color: AppTheme.neutral)),
            Text('Cash out USDC to bank from the home screen', style: TextStyle(color: AppTheme.neutralLight, fontSize: 12)),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: cashouts.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (ctx, i) {
        final c = cashouts[i];
        final amount = double.tryParse(c.amount)?.toStringAsFixed(2) ?? c.amount;
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppTheme.surfaceWhite,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.neutralLight.withOpacity(0.5)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(color: AppTheme.accent.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
                    child: const Icon(Icons.account_balance_rounded, color: AppTheme.accent, size: 18),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Bank Cashout', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                        Text(c.bankRef.split('|').first, style: const TextStyle(color: AppTheme.neutral, fontSize: 12)),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('-\$$amount', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: AppTheme.neutral)),
                      const Text('USDC', style: TextStyle(color: AppTheme.neutral, fontSize: 11)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(Icons.info_outline_rounded, size: 12, color: AppTheme.neutral),
                  const SizedBox(width: 4),
                  Expanded(child: Text('Ref: ${c.bankRef}', style: const TextStyle(color: AppTheme.neutral, fontSize: 11))),
                  StatusBadge(c.status),
                ],
              ),
            ],
          ),
        ).animate().fadeIn(delay: Duration(milliseconds: i * 50));
      },
    );
  }
}
