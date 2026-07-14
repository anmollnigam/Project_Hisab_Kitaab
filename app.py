from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor

# We configure Flask to serve static files (HTML, CSS, JS) from the current folder
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# ============================================================
# ROUTE: SERVE THE FRONTEND
# ============================================================
@app.route('/')
def home():
    return app.send_static_file('index.html')

# ============================================================
# DATABASE CONNECTION SETUP
# ============================================================
DB_CONFIG = {
    "dbname": "hisab_kitab",
    "user": "postgres",          
    "password": "12345",  # <-- PUT YOUR PASSWORD HERE AGAIN
    "host": "localhost",
    "port": "5432"
}

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)

# ============================================================
# ROUTE 1: SHOP LOGIN
# ============================================================
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    shop_id = data.get('shopId', '').strip()
    password = data.get('password', '').strip()
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT shop_id FROM shops WHERE shop_id = %s AND password = %s;", (shop_id, password))
        shop = cur.fetchone()
        if shop:
            return jsonify({"success": True, "shopName": shop['shop_id']}), 200
        return jsonify({"success": False, "message": "Invalid Shop ID or Password."}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

# ============================================================
# ROUTE 2: ADD NEW CUSTOMER
# ============================================================
@app.route('/api/customers', methods=['POST'])
def add_customer():
    data = request.get_json()
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    
    if not name or not phone:
        return jsonify({"success": False, "message": "Name and phone are required."}), 400
        
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT phone FROM customers WHERE phone = %s;", (phone,))
        if cur.fetchone():
            return jsonify({"success": False, "message": "Customer already exists."}), 400
            
        cur.execute("INSERT INTO customers (name, phone, balance) VALUES (%s, %s, 0);", (name, phone))
        conn.commit()
        return jsonify({"success": True}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

# ============================================================
# ROUTE 3: SEARCH CUSTOMER BY PHONE (UPDATED FOR HISTORY)
# ============================================================
@app.route('/api/customers/<phone>', methods=['GET'])
def search_customer(phone):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # 1. Get the customer's main profile
        cur.execute("SELECT name, phone, balance FROM customers WHERE phone = %s;", (phone,))
        customer = cur.fetchone()
        
        if not customer:
            return jsonify({"success": False, "message": "No customer found with this number."}), 404
            
        # 2. Get the customer's transaction history, newest first
        cur.execute("SELECT amount, transaction_type, reason, created_at FROM transactions WHERE customer_phone = %s ORDER BY created_at DESC;", (phone,))
        history = cur.fetchall()
        
        # 3. Return both to the frontend
        return jsonify({"success": True, "customer": customer, "history": history}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

# ============================================================
# ROUTE 4: UPDATE BALANCE (ADD/SUBTRACT UDHAAR)
# ============================================================
@app.route('/api/customers/<phone>/udhaar', methods=['PATCH'])
def update_udhaar(phone):
    data = request.get_json()
    amount = int(data.get('amount', 0))
    update_type = data.get('type')  # "add" or "subtract"
    reason = data.get('reason', '').strip()  # <-- Catching the reason text
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT balance FROM customers WHERE phone = %s;", (phone,))
        customer = cur.fetchone()
        if not customer:
            return jsonify({"success": False, "message": "Customer not found."}), 404
            
        current_balance = customer['balance']
        new_balance = current_balance + amount if update_type == "add" else current_balance - amount
            
        # 1. Update the main customer balance
        cur.execute("UPDATE customers SET balance = %s WHERE phone = %s RETURNING name, phone, balance;", (new_balance, phone))
        updated_customer = cur.fetchone()
        
        # 2. Insert the record into the history table
        cur.execute(
            "INSERT INTO transactions (customer_phone, amount, transaction_type, reason) VALUES (%s, %s, %s, %s);",
            (phone, amount, update_type, reason)
        )
        
        conn.commit()  # Saves both updates safely
        return jsonify({"success": True, "customer": updated_customer}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

# ============================================================
# ROUTE 5: GET ALL CUSTOMERS (For Dashboard Stats)
# ============================================================
@app.route('/api/customers', methods=['GET'])
def get_all_customers():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM customers;")
        customers = cur.fetchall()
        return jsonify({"success": True, "customers": customers}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    app.run(port=3000, debug=True)