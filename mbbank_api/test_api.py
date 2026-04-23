from mbbank import MBBank
import datetime

mb = MBBank(username="0867809383", password="Long1996!!")
h = mb.getTransactionAccountHistory(
    from_date=datetime.datetime.now() - datetime.timedelta(days=5),
    to_date=datetime.datetime.now()
)
txs = [tx.model_dump() for tx in h.transactionHistoryList]
print(f"Found {len(txs)} transactions")
for t in txs[:5]:
    print(f"  {t['transactionDate']} | credit={t['creditAmount']} debit={t['debitAmount']} | {t['description'][:80]}")
