[API](https://auto-api.com/dongchedi#api)

### **Base URL**

https://{access\_name}.auto-api.com/api/v2/dongchedi

Authorization: api\_key parameter

### **Workflow**

1  
/filtersget available filter options  
2  
/offersretrieve listings (with or without filters) \- optimal for initial data load  
3  
To keep data synchronized after initial load:

/change\_id?date=...get starting ID for changes feed

/changes?change\_id=...get all updates from the database starting from ID  
4  
/offerget full details of a specific listing by inner\_id  
Recommended integration workflow:

1\. Start with /offers for full data extraction (iterate through all pages)

2\. Periodically call /changes to retrieve all updates (additions/modifications/removals) and keep your database in sync

3\. For frontend integration, use /offers with filters and pagination (brand, model, price, year, etc.)

### **GET/filters**

Returns all available filters and possible values

https://{access\_name}.auto-api.com/api/v2/dongchedi/filters?api\_key=YOUR\_API\_KEY  
Response:

{  
  "mark": {  
    "BMW": {  
      "model": {  
        "X5": { "complectation": \["xDrive40i", "xDrive50i"\] },  
        "X3": { "complectation": \["xDrive30i"\] }  
      }  
    },  
    "Audi": {  
      "model": {  
        "A4": { "complectation": \["40 TFSI", "45 TFSI"\] }  
      }  
    }  
  },  
  "transmission\_type": \["Manual", "Automatic", "CVT", "DCT", "Wet DCT", "Dry DCT", "AMT", "E-CVT", "DHT", "Sequential", "Single-Speed"\],  
  "color": \["White", "Black", "Silver", "Dark Gray", "Blue", "Red", "Brown", "Orange", "Yellow", "Green", "Purple", "Champagne", "Other"\],  
  "body\_type": \["SUV", "Sedan", "Hatchback", "Minivan", "Wagon", "Coupe", "Convertible", "Pickup", "Liftback", "Microvan", "Sports Car", "Mini Truck", "Light Commercial", "Motorhome"\],  
  "engine\_type": \["Petrol", "Diesel", "Electric", "Hybrid", "PHEV", "EREV", "Bi-Fuel", "CNG"\],  
  "drive\_type": \["FWD", "RWD", "AWD"\]  
}

### **GET/offers**

Listings endpoint with pagination and filtering

#### Parameters:

* page (required) \- page number  
* mark, model, complectation \- filters (case-insensitive)  
* transmission\_type, color, body\_type, engine\_type, drive\_type \- filters (case-insensitive)  
* year\_from, year\_to \- year range filter  
* km\_age\_from, km\_age\_to \- mileage range filter  
* price\_from, price\_to \- price range filter (in CNY)

https://{access\_name}.auto-api.com/api/v2/dongchedi/offers?api\_key=YOUR\_API\_KEY\&page=1

https://{access\_name}.auto-api.com/api/v2/dongchedi/offers?api\_key=YOUR\_API\_KEY\&page=1\&mark=BMW\&color=black  
Response:

{  
  "result": \[  
    {  
      "id": 2648717,  
      "inner\_id": "40307747",  
      "change\_type": "added",  
      "created\_at": "2025-08-14T19:39:18.380Z",  
      "data": {  
        "id": 1380988,  
        "inner\_id": "40307747",  
        "url": "https://www.dongchedi.com/auto/pu-40307747",  
        "mark": "BYD",  
        "model": "Tang DM",  
        "complectation": "2.0T Hybrid AWD Premium",  
        "year": 2022,  
        "color": "Pearl White",  
        "price": 268000,  
        "km\_age": 18500,  
        "body\_type": "SUV",  
        "engine\_type": "Hybrid",  
        "transmission\_type": "Automatic",  
        "address": "Beijing, Chaoyang District",  
        "is\_dealer": true,  
        "displacement": 2.0,  
        "city": "Beijing",  
        "title": "BYD Tang DM 2022 Premium",  
        "owners\_count": 1,  
        "drive\_type": "all-wheel",  
        "equipment": \["Heated Seats", "360 Camera", "Autopilot"\],  
        "horse\_power": 321,  
        "reg\_date": "2022-06-15",  
        "section": "Used",  
        "seller": "BYD 4S Store",  
        "seller\_type": "DEALER",  
        "salon\_id": "20230918001",  
        "region": "Beijing",  
        "description": "Excellent condition, no accidents, first owner...",  
        "images": \["https://p3.dcarstatic.com/img/msb-pic/40307747\_001.jpg"\],  
        "extra\_prep": {"inspection": {...}, "warranty": "1 year"}  
      }  
    }  
  \],  
  "meta": { "page": 1, "next\_page": 2, "limit": 20 }  
}

#### Data fields:

* id \- internal database ID  
* inner\_id \- listing ID on the platform  
* url \- link to the listing  
* mark \- car brand  
* model \- car model  
* complectation \- complectation/trim  
* year \- production year  
* color \- color  
* price \- price in CNY  
* km\_age \- mileage in km  
* body\_type \- body type  
* engine\_type \- engine type  
* transmission\_type \- transmission type  
* address \- address  
* is\_dealer \- dealer flag (true/false)  
* displacement \- engine displacement  
* city \- city  
* title \- listing title  
* owners\_count \- number of owners  
* drive\_type \- drive type  
* equipment \- equipment list  
* horse\_power \- power in hp  
* reg\_date \- registration date  
* section \- section  
* seller \- seller  
* seller\_type \- seller type  
* salon\_id \- dealer ID  
* region \- region  
* description \- description  
* images \- array of image URLs  
* extra\_prep \- additional data (JSON)

### **GET/change\_id**

Get initial change ID by date (for use in /changes)

#### Parameters:

* date (required) \- date in yyyy-mm-dd format

https://{access\_name}.auto-api.com/api/v2/dongchedi/change\_id?api\_key=YOUR\_API\_KEY\&date=2025-01-15  
Response:

{ "change\_id": 2859364 }

*Use the returned value as the change\_id parameter in /changes*

### **GET/changes**

Changes feed (added/changed/removed listings)

#### Parameters:

* change\_id (required) \- starting from which change ID

https://{access\_name}.auto-api.com/api/v2/dongchedi/changes?api\_key=YOUR\_API\_KEY\&change\_id=1  
Response:

{  
  "result": \[  
    {  
      "id": 456,  
      "inner\_id": "40307747",  
      "change\_type": "added",    // added \- new listing  
      "created\_at": "2025-01-15T10:30:00Z",  
      "data": { ... }            // full listing data  
    },  
    {  
      "id": 457,  
      "inner\_id": "40307748",  
      "change\_type": "changed",  // changed \- price update  
      "created\_at": "2025-01-15T10:31:00Z",  
      "data": { "new\_price": 258000 }  
    },  
    {  
      "id": 458,  
      "inner\_id": "40307749",  
      "change\_type": "removed",  // removed \- listing deleted  
      "created\_at": "2025-01-15T10:32:00Z"  
    }  
  \],  
  "meta": { "cur\_change\_id": 1, "next\_change\_id": 21, "limit": 20 }  
}

### **GET/offer**

Details for a single listing by inner\_id

#### Parameters:

* inner\_id (required)

https://{access\_name}.auto-api.com/api/v2/dongchedi/offer?api\_key=YOUR\_API\_KEY\&inner\_id=40307747  
*Response: data object (same structure as /offers items, without result wrapper)*  
[Get Listing by URL](https://auto-api.com/dongchedi#offer)  
Retrieve complete listing data by providing the dongchedi.com URL

### **Base URL**

https://{access\_name}.auto-api.com/api/v1/offer/info

Authorization: header x-api-key

### **POST/api/v1/offer/info**

Get listing data from dongchedi.com by URL

#### Parameters:

* url (required) \- link to the listing on dongchedi.com

Request Example:

curl \-L 'https://{access\_name}.auto-api.com/api/v1/offer/info' \\  
  \-H 'x-api-key: YOUR\_API\_KEY' \\  
  \-H 'Content-Type: application/json' \\  
  \-d '{ "url": "https://www.dongchedi.com/usedcar/20804886" }'

Response:

{  
  "car\_name": "Mercedes-Benz Mercedes-Benz GL-Class GL 500 4MATIC 2013",  
  "url": "https://www.dongchedi.com/usedcar/20804886",  
  "mark": "Mercedes-Benz",  
  "model": "Mercedes-Benz GL-Class",  
  "year": 2013,  
  "color": "black",  
  "price": 188000,  
  "km\_age": 221000,  
  "engine\_type": "petrol",  
  "transmission\_type": "automatic",  
  "body\_type": "SUV",  
  "displacement": "4.7",  
  "seller\_type": "dealer",  
  "is\_dealer": true,  
  "drive\_type": "AWD",  
  "description": "13年奔驰GL550. 全车原版原漆...",  
  "horse\_power": 435,  
  "complectation": "GL 500 4MATIC",  
  "city": "北京",  
  "region": "北京",  
  "owners\_count": 3,  
  "reg\_date": "2013-09-01",  
  "images": \[  
    "https://p3-dcd-sign.byteimg.com/tos-cn-i-f042mdwyw7/b5efd10487e84032a2060b0e5c79063a\~tplv-f042mdwyw7-auto-webp:640:0.jpg",  
    "https://p3-dcd-sign.byteimg.com/tos-cn-i-f042mdwyw7/1f3c9ca089684c97a3e5e57b6f8c6915\~tplv-f042mdwyw7-auto-webp:640:0.jpg",  
    "https://p3-dcd-sign.byteimg.com/tos-cn-i-f042mdwyw7/934853a8fcf84d5ca46448ccb60ae42e\~tplv-f042mdwyw7-auto-webp:640:0.jpg"  
  \]  
}

#### Field Descriptions:

* car\_name \- full vehicle name  
* url \- link to the listing  
* mark \- car brand  
* model \- car model  
* year \- production year  
* color \- vehicle color  
* price \- price in CNY  
* km\_age \- mileage in kilometers  
* engine\_type \- engine type  
* transmission\_type \- transmission type  
* body\_type \- body type  
* offer\_created \- listing creation date  
* displacement \- engine displacement (liters)  
* vin \- vehicle identification number  
* seller\_type \- seller type  
* is\_dealer \- dealer flag  
* drive\_type \- drive type  
* description \- listing description  
* horse\_power \- engine power (hp)  
* complectation \- trim level  
* city \- city  
* region \- region/province  
* owners\_count \- number of previous owners  
* reg\_date \- registration date  
* images \- array of image URLs

[Daily Exports](https://auto-api.com/dongchedi#daily)

### **Data Storage Protocol**

Files are stored for 3+ days.

### **API Delivery Schedule**

Daily files are ready for download.

### **CSV File Configuration**

CSV files use pipe (|) as column separator.

### **URL Structure:**

https://{access\_name}.auto-api.com/{date}/{file\_name}

### **Request Parameters:**

* access\_name \- access\_name \- your assigned subdomain identifier  
* date \- date \- target date in yyyy-mm-dd format (e.g., 2025-09-06)  
* file\_name \- file\_name \- export file name with extension

### **Available Formats:**

* CSV \- all\_active.csv, new\_daily.csv, removed\_daily.csv  
* JSON \- all\_active.json, new\_daily.json, removed\_daily.json  
* Excel \- all\_active.xlsx, new\_daily.xlsx, removed\_daily.xlsx

### **cURL API Request Example**

curl \-L \-X GET 'https://{access\_name}.auto-api.com/yyyy-mm-dd/all\_active.csv' \\  
  \-H 'Authorization: Basic XXX' \\

  \-o daily\_car\_data.csv

### **Wget Download Command**

wget \--method GET \\  
  \--header 'Authorization: Basic XXX==' \\

  'https://{access\_name}.auto-api.com/yyyy-mm-dd/all\_active.csv'  
Dongchedi.com  
Dongchedi is a leading car platform in China. Millions of people use it to buy, sell, and research vehicles. Dealers and private sellers post new and used cars, motorcycles, and commercial vehicles across major cities.

Each listing includes clear specs, high‑quality photos, price history, and seller checks. You can filter by brand, model, year, price, and location to quickly find the right car.

Beyond listings, Dongchedi offers news, reviews, side‑by‑side comparisons, and market insights to help buyers decide with confidence. Strong ties with verified sellers and official dealers keep quality high.

The API provides organized data from the Dongchedi marketplace through reliable endpoints. Use it in your apps for pricing, inventory tracking, and market analysis.  
*Our real-time API operates 24/7, detecting new listings within minutes and tracking removals to reflect actual market movements. No custom parsers or crawlers required.*  
