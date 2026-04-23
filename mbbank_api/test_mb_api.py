import urllib.request
import json
import ssl

url = "http://167.71.212.70:3000/api/mbbank/transactions?days=5"
req = urllib.request.Request(url)

try:
    with urllib.request.urlopen(req) as response:
        res = response.read().decode('utf-8')
        data = json.loads(res)
        print(f"Transactions found: {len(data.get('transactions', []))}")
        for tx in data.get('transactions', [])[:5]:
            print(f"- {tx.get('transactionDate')} | {tx.get('creditAmount')} VND | {tx.get('transactionDesc')}")
except Exception as e:
    print(f"Error: {e}")
