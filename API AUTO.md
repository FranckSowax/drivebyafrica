[API](https://auto-api.com/encar#api)

### **Base URL**

https://{access\_name}.auto-api.com/api/v2/encar

Authorization: api\_key parameter

### **Workflow**

1  
/filtersretrieve all available filter options  
2  
/offersfetch vehicle listings with optional filters \- ideal for initial data retrieval  
3  
To stay synchronized after initial load:

/change\_id?date=...obtain the starting point for the changes stream

/changes?change\_id=...retrieve all database modifications from a given ID  
4  
/offerfetch complete details for a specific vehicle by inner\_id  
Recommended integration approach:

1\. Use /offers to retrieve the full initial dataset (paginate through all available pages)

2\. After initial load, use /changes periodically to fetch incremental updates (additions/modifications/removals) and keep your local database in sync

3\. For displaying data on your website, query /offers with specific filters and pagination (by brand, model, price range, year, etc.)

### **GET/filters**

Returns all available filter options and their possible values

https://{access\_name}.auto-api.com/api/v2/encar/filters?api\_key=YOUR\_API\_KEY  
Response:

{  
  "mark": {  
    "Hyundai": {  
      "model": {  
        "Sonata": {  
          "configuration": {  
            "DN8": { "complectation": \["Smart", "Modern", "Premium"\] }  
          }  
        }  
      }  
    },  
    "Kia": {  
      "model": {  
        "K5": {  
          "configuration": {  
            "DL3": { "complectation": \["LX", "EX", "SX"\] }  
          }  
        }  
      }  
    }  
  },  
  "transmission\_type": \["Manual", "Automatic", "Semi-Automatic", "CVT", "Other"\],  
  "color": \["White", "Black", "Silver", "Gray", "Blue", "Red", "Brown", "Beige", "Gold", "Green", "Yellow", "Orange", "Purple", "Pink", "Pearl", "Burgundy", "Turquoise", "Sky Blue", "Other"\],  
  "body\_type": \["SUV", "Sedan", "Hatchback", "Minivan", "Pickup Truck", "Coupe/Roadster", "Microbus", "RV", "Other"\],  
  "engine\_type": \["Gasoline", "Diesel", "Electric", "Hybrid (Gasoline)", "Hybrid (Diesel)", "Hydrogen", "LPG", "CNG", "Gasoline \+ LPG", "Gasoline \+ CNG", "LPG \+ Electric", "Other"\]  
}

### **GET/offers**

Vehicle listings with pagination support and filtering capabilities

#### Parameters:

* page (required) \- page number  
* mark, model, configuration, complectation \- filters (case-insensitive)  
* transmission\_type, color, body\_type, engine\_type \- filters (case-insensitive)  
* year\_from, year\_to \- year range filter  
* km\_age\_from, km\_age\_to \- mileage range filter  
* price\_from, price\_to \- price range filter (in 10000 KRW units)

https://{access\_name}.auto-api.com/api/v2/encar/offers?api\_key=YOUR\_API\_KEY\&page=1

https://{access\_name}.auto-api.com/api/v2/encar/offers?api\_key=YOUR\_API\_KEY\&page=1\&mark=Hyundai\&color=black  
Response:

{  
  "result": \[  
    {  
      "id": 3219435,  
      "inner\_id": "40427050",  
      "change\_type": "added",  
      "created\_at": "2025-09-08T12:02:03.000Z",  
      "data": {  
        "id": 1454012,  
        "inner\_id": "40427050",  
        "url": "http://www.encar.com/dc/dc\_cardetailview.do?carid=40427050",  
        "mark": "Hyundai",  
        "model": "Palisade",  
        "generation": "Diesel 2.2 4WD",  
        "configuration": "Diesel 2.2 4WD",  
        "complectation": "Prestige",  
        "year": 2021,  
        "color": "Black",  
        "price": 3190,  
        "price\_won": "31900000",  
        "km\_age": 92842,  
        "engine\_type": "Diesel",  
        "transmission\_type": "Automatic",  
        "body\_type": "SUV",  
        "address": "Busan Gijang-gun",  
        "seller\_type": "DEALER",  
        "is\_dealer": true,  
        "images": \["https://ci.encar.com/carpicture01/pic4041/40427050\_001.jpg"\],  
        "extra": {"diagnosis": {...}, "inspection": {...}, "accidents": \[...\]}  
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
* generation \- generation  
* configuration \- configuration  
* complectation \- complectation/trim  
* year \- production year  
* color \- color  
* price \- price in 10000 KRW units  
* price\_won \- full price in KRW  
* km\_age \- mileage in km  
* engine\_type \- engine type  
* transmission\_type \- transmission type  
* body\_type \- body type  
* address \- address  
* seller\_type \- seller type  
* is\_dealer \- dealer flag (true/false)  
* section \- section  
* seller \- seller  
* salon\_id \- dealer ID  
* description \- description  
* displacement \- engine displacement (cc)  
* offer\_created \- listing creation date  
* images \- array of image URLs  
* extra \- additional data (JSON)  
* options \- list of options

### **GET/change\_id**

Retrieve the first change ID for a specific date (to use with /changes)

#### Parameters:

* date (required) \- date in yyyy-mm-dd format

https://{access\_name}.auto-api.com/api/v2/encar/change\_id?api\_key=YOUR\_API\_KEY\&date=2025-01-15  
Response:

{ "change\_id": 8471926 }

*Use the returned value as the change\_id parameter in /changes*

### **GET/changes**

Real-time changes stream (new listings/price updates/removals)

#### Parameters:

* change\_id (required) \- starting from which change ID

https://{access\_name}.auto-api.com/api/v2/encar/changes?api\_key=YOUR\_API\_KEY\&change\_id=1  
Response:

{  
  "result": \[  
    {  
      "id": 456,  
      "inner\_id": "40427050",  
      "change\_type": "added",    // added \- new listing  
      "created\_at": "2025-01-15T10:30:00Z",  
      "data": { ... }            // full listing data  
    },  
    {  
      "id": 457,  
      "inner\_id": "40427051",  
      "change\_type": "changed",  // changed \- price update  
      "created\_at": "2025-01-15T10:31:00Z",  
      "data": { "new\_price": 3490, "new\_price\_won": 34900000 }  
    },  
    {  
      "id": 458,  
      "inner\_id": "40427052",  
      "change\_type": "removed",  // removed \- listing deleted  
      "created\_at": "2025-01-15T10:32:00Z"  
    }  
  \],  
  "meta": { "cur\_change\_id": 1, "next\_change\_id": 21, "limit": 20 }  
}

### **GET/offer**

Complete details of a single vehicle listing by inner\_id

#### Parameters:

* inner\_id (required)

https://{access\_name}.auto-api.com/api/v2/encar/offer?api\_key=YOUR\_API\_KEY\&inner\_id=40427050  
*Response: data object (identical structure to /offers items, without the result array wrapper)*  
[Get Listing by URL](https://auto-api.com/encar#offer)  
Retrieve complete listing data by providing the encar.com URL

### **Base URL**

https://{access\_name}.auto-api.com/api/v1/offer/info

Authorization: header x-api-key

### **POST/api/v1/offer/info**

Get listing data from encar.com by URL

#### Parameters:

* url (required) \- link to the listing on encar.com

Request Example:

curl \-L 'https://{access\_name}.auto-api.com/api/v1/offer/info' \\  
  \-H 'x-api-key: YOUR\_API\_KEY' \\  
  \-H 'Content-Type: application/json' \\  
  \-d '{ "url": "http://www.encar.com/dc/dc\_cardetailview.do?carid=39225419" }'

Response:

{  
  "inner\_id": "39225419",  
  "url": "http://www.encar.com/dc/dc\_cardetailview.do?carid=39225419",  
  "mark": "BMW",  
  "model": "5-Series",  
  "generation": "528i",  
  "year": 2010,  
  "year\_month": "2010-08",  
  "color": "Silver",  
  "price": 880,  
  "price\_won": 8800000,  
  "km\_age": 132437,  
  "engine\_type": "Gasoline",  
  "transmission\_type": "Automatic",  
  "body\_type": "Sedan",  
  "displacement": "2996",  
  "power": "230",  
  "vin": "WBAFR1105AC258998",  
  "address": "Gwangju Seo-gu",  
  "seller\_type": "DEALER",  
  "is\_dealer": true,  
  "offer\_created": "2025-11-17",  
  "images": \[  
    "https://ci.encar.com/carpicture02/pic3922/39225419\_001.jpg",  
    "https://ci.encar.com/carpicture02/pic3922/39225419\_002.jpg"  
  \]  
}

#### Field Descriptions:

* inner\_id \- listing ID on encar.com  
* url \- link to the listing  
* mark \- car brand  
* model \- car model  
* generation \- vehicle generation/trim  
* year \- production year  
* year\_month \- production year and month (YYYY-MM)  
* color \- vehicle color  
* price \- price in units of 10,000 KRW  
* km\_age \- mileage in kilometers  
* engine\_type \- engine type  
* transmission\_type \- transmission type  
* body\_type \- body type  
* displacement \- engine displacement (cc)  
* power \- engine power (hp)  
* vin \- vehicle identification number  
* address \- seller location  
* seller\_type \- seller type  
* is\_dealer \- dealer flag  
* offer\_created \- listing creation date  
* images \- array of image URLs

[Daily Exports](https://auto-api.com/encar#daily)

### **Data Retention Policy**

Files stored for 3+ days minimum

### **API Availability Schedule**

Fresh daily files available for download

### **CSV Data Format**

CSV files use pipe (|) as column separator

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
