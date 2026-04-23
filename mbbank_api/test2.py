import datetime
from mbbank import MBBank

mb = MBBank(username="0867809383", password="Long1996!!", tesseract_path="tesseract") # tesseract might not be needed?
from_date = datetime.datetime.now() - datetime.timedelta(days=5)
to_date = datetime.datetime.now()

try:
    history = mb.getTransactionAccountHistory(from_date=from_date, to_date=to_date)
    print("History:", len(history.get("transactionHistoryList", [])), "items found")
except Exception as e:
    print("Error:", e)
