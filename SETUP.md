# Setup Instructions

## 1. Google Sheet Setup
Create a new Google Sheet and create the following tabs (sheets) with the exact names and header rows (row 1):

### Sheet: `Products`
| id | name | category | base_price | image_url | active |
|----|------|----------|------------|-----------|--------|
| P1 | Vanilla Cone | Ice Cream | 2.50 | | TRUE |
| P2 | Chocolate Cup | Ice Cream | 3.00 | | TRUE |

### Sheet: `Modifiers`
| id | group_name | name | price_adjustment | applicable_categories |
|----|------------|------|------------------|-----------------------|
| M1 | Size | Large | 1.00 | Ice Cream |
| M2 | Flavor | Chocolate | 0.00 | Ice Cream |
| M3 | Topping | Sprinkles | 0.50 | ALL |

### Sheet: `Tables`
| table_id | name | status | active |
|----------|------|--------|--------|
| T1 | Mesa 1 | Available | TRUE |
| T2 | Mesa 2 | Available | TRUE |
| T3 | Mesa 3 | Available | TRUE |
| T4 | Mesa 4 | Available | TRUE |
| T5 | Mesa 5 | Available | TRUE |
| T6 | Mesa 6 | Available | TRUE |

### Sheet: `Orders`
| order_id | timestamp | table_number | status | total_amount | payment_method |
|----------|-----------|--------------|--------|--------------|----------------|

### Sheet: `OrderItems`
| item_id | order_id | product_name | modifiers_detail | quantity | original_price | discount | final_price | notes |
|---------|----------|--------------|------------------|----------|----------------|----------|-------------|-------|

## 2. Google Apps Script
1. Open the Sheet.
2. Go to **Extensions > Apps Script**.
3. Create the following files and copy the code provided in the project.
