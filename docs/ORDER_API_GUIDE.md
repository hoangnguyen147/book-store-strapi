# 📦 Order API Usage Guide

## 🎯 Create Order API - Complete Guide

The Create Order API allows you to create a complete order with multiple books in **ONE API call**.

### 📋 **IMPORTANT: What You Pass vs What Gets Created**

| What YOU provide | What the API creates automatically |
|------------------|-----------------------------------|
| `book_id` (integer) | Order items with book relations |
| `quantity` (integer) | Unit prices from book data |
| `shipping_address` (optional) | Total prices (unit_price × quantity) |
| `phone` (optional) | Order total amount |
| `notes` (optional) | Inventory deduction |

**❌ DO NOT pass order item IDs - they don't exist yet!**
**✅ DO pass book IDs and quantities - the API creates order items automatically!**

---

## 🚀 **API Endpoint**

```
POST /api/orders
Authorization: Bearer <your-token>
Content-Type: application/json
```

---

## 📝 **Request Format**

```json
{
  "data": {
    "items": [
      {
        "book_id": 1,        // ← Book ID from GET /api/books
        "quantity": 2        // ← How many copies you want
      },
      {
        "book_id": 5,        // ← Another book ID
        "quantity": 1        // ← How many copies you want
      }
    ],
    "shipping_address": "123 Nguyen Hue Street, Ho Chi Minh City",  // Optional
    "phone": "+84901234567",                                        // Optional
    "notes": "Please deliver in the morning"                       // Optional
  }
}
```

---

## 📖 **Step-by-Step Example**

### Step 1: Get Available Books
```bash
GET /api/books?pagination[limit]=5
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,                    // ← Use this ID in your order
      "name": "The Great Gatsby",
      "sale_price": 25000,
      "quantity": 50              // ← Available inventory
    },
    {
      "id": 5,                    // ← Use this ID in your order
      "name": "To Kill a Mockingbird",
      "sale_price": 30000,
      "quantity": 20              // ← Available inventory
    }
  ]
}
```

### Step 2: Create Order with Book IDs
```bash
POST /api/orders
```

**Request:**
```json
{
  "data": {
    "items": [
      {
        "book_id": 1,     // ← ID from Step 1
        "quantity": 2     // ← Want 2 copies
      },
      {
        "book_id": 5,     // ← ID from Step 1
        "quantity": 1     // ← Want 1 copy
      }
    ],
    "shipping_address": "123 Main Street",
    "phone": "+84901234567"
  }
}
```

### Step 3: Get Complete Order Response
```json
{
  "data": {
    "id": 1,
    "documentId": "order123abc",
    "total_amount": 80000,        // ← Calculated automatically: (25000×2) + (30000×1)
    "status": "pending",
    "shipping_address": "123 Main Street",
    "phone": "+84901234567",
    "order_items": [              // ← Created automatically from your book_ids
      {
        "id": 1,                  // ← Order item ID (created by API)
        "quantity": 2,
        "unit_price": 25000,      // ← From book.sale_price
        "total_price": 50000,     // ← Calculated: 25000 × 2
        "book": {
          "id": 1,
          "name": "The Great Gatsby",
          "quantity": 48          // ← Updated inventory: 50 - 2 = 48
        }
      },
      {
        "id": 2,                  // ← Order item ID (created by API)
        "quantity": 1,
        "unit_price": 30000,      // ← From book.sale_price
        "total_price": 30000,     // ← Calculated: 30000 × 1
        "book": {
          "id": 5,
          "name": "To Kill a Mockingbird",
          "quantity": 19          // ← Updated inventory: 20 - 1 = 19
        }
      }
    ],
    "user": {
      "id": 199,
      "username": "customer1"
    },
    "createdAt": "2025-06-15T09:45:00.000Z"
  }
}
```

---

## ⚡ **What Happens Automatically**

1. **✅ Inventory Check** - Validates all books have enough quantity
2. **✅ Order Creation** - Creates the main order record
3. **✅ Order Items Creation** - Creates order items automatically from your book_ids
4. **✅ Price Calculation** - Gets unit prices from book data
5. **✅ Total Calculation** - Calculates total amount automatically
6. **✅ Inventory Deduction** - Reduces book quantities automatically
7. **✅ Transaction Safety** - If ANY step fails, EVERYTHING is rolled back

---

## 🛡️ **Error Handling**

### Insufficient Inventory
```json
{
  "error": {
    "message": "Insufficient inventory for \"The Great Gatsby\". Available: 5, Requested: 10"
  }
}
```

### Book Not Found
```json
{
  "error": {
    "message": "Book with ID 999 not found"
  }
}
```

### Invalid Data
```json
{
  "error": {
    "message": "Each item must have quantity > 0"
  }
}
```

---

## 🎯 **Key Points to Remember**

1. **Pass book IDs, not order item IDs** - Order items are created automatically
2. **One API call does everything** - No need for multiple requests
3. **Automatic inventory management** - Books quantities are updated automatically
4. **Transaction safety** - All-or-nothing approach
5. **Complete response** - Get full order details with all relations

---

## 🔗 **Related APIs**

- `GET /api/books` - Get available books and their IDs
- `GET /api/orders` - List all orders
- `GET /api/orders/{documentId}` - Get specific order details
- `PUT /api/orders/{documentId}` - Update order status

---

## 💡 **Pro Tips**

1. Always check book inventory before creating orders
2. Use meaningful shipping addresses and phone numbers
3. The API returns updated book quantities so you can update your UI
4. Order items are automatically created - don't try to create them separately
5. Total amounts are calculated automatically from book prices
