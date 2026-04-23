"""
Payment checker microservice - wraps MBBank transaction check via Node API.
Runs on port 5555 alongside the main Node.js server.
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import datetime
from mbbank import MBBank

app = Flask(__name__)
CORS(app)

PAYMENT_AMOUNT = int(os.getenv("PAYMENT_AMOUNT", "40000"))

# Initialize MBBank instance with provided credentials
mb_instance = MBBank(username="0867809383", password="Long1996!!")

def get_transactions_cached(days=5):
    try:
        from_date = datetime.datetime.now() - datetime.timedelta(days=days)
        to_date = datetime.datetime.now()
        history = mb_instance.getTransactionAccountHistory(from_date=from_date, to_date=to_date)
        # return as dicts to keep compatibility with existing code
        return [tx.model_dump() for tx in history.transactionHistoryList]
    except Exception as e:
        print(f"Error fetching MBBank API: {e}")
        return None


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True})

@app.route("/check-payment", methods=["POST"])
def check_payment():
    """
    Check if a payment with a specific transfer content has been received.
    Body: { "content": "GPT12345" }
    """
    body = request.get_json(silent=True) or {}
    content = (body.get("content") or "").strip().upper()
    
    try:
        requested_amount = int(body.get("amount", PAYMENT_AMOUNT))
    except (TypeError, ValueError):
        requested_amount = PAYMENT_AMOUNT
    
    if not content:
        return jsonify({"success": False, "error": "Missing content"}), 400
    
    try:
        txs = get_transactions_cached(days=5)
        
        if txs is None:
            return jsonify({"success": False, "error": "Không thể kết nối MBBank API. Thử lại sau."}), 503
        
        # Search for matching credit transaction
        for tx in txs:
            amount = float(tx.get("creditAmount", 0))
            desc_raw = tx.get("description") or tx.get("addDescription") or ""
            desc = desc_raw.upper()
            
            # Only incoming (credit) transactions
            if amount >= requested_amount and content in desc:
                return jsonify({
                    "success": True,
                    "paid": True,
                    "amount": int(amount),
                    "description": desc_raw,
                    "date": tx.get("transactionDate", "")
                })
        
        return jsonify({
            "success": True,
            "paid": False,
            "message": "Chưa tìm thấy giao dịch. Vui lòng đợi 1-2 phút sau khi chuyển khoản."
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/transactions", methods=["GET"])
def get_transactions():
    """Return recent transaction history for dashboard display."""
    try:
        days = int(request.args.get("days", 5))
        txs = get_transactions_cached(days=days)

        if txs is None:
            return jsonify({
                "success": False,
                "error": "Không thể lấy lịch sử giao dịch từ Node API."
            }), 503

        # Return txs
        result = []
        for tx in txs:
            credit = float(tx.get("creditAmount", 0))
            debit = float(tx.get("debitAmount", 0))
            amount = credit if credit > 0 else -debit
            
            desc_raw = tx.get("description") or tx.get("addDescription") or ""
            
            result.append({
                "amount": amount,
                "description": desc_raw,
                "date": tx.get("transactionDate", ""),
                "ref": tx.get("refNo", ""),
                "type": "IN" if credit > 0 else "OUT"
            })

        return jsonify({
            "success": True,
            "transactions": result,
            "count": len(result)
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PAYMENT_PORT", "5555"))
    print(f"[Payment] Payment checker (MBBank) running on port {port}")
    app.run(host="127.0.0.1", port=port, debug=False)
