[API](https://auto-api.com/che168#api)

### **Base URL**

https://{access\_name}.auto-api.com/api/v2/che168

Authorization: api\_key parameter

### **Workflow**

1  
/filtersquery all available filter options  
2  
/offersget car listings with pagination and filtering \- recommended for bulk data import  
3  
For keeping your data current after the initial import:

/change\_id?date=...get the initial ID to begin tracking changes

/changes?change\_id=...fetch all updates since a specified change ID  
4  
/offerretrieve full details of a single listing using inner\_id  
Suggested integration workflow:

1\. Begin with /offers to download the complete dataset (iterate through all pages)

2\. Then poll /changes at regular intervals to capture all updates (additions/changes/removals) and synchronize your database

3\. To display data on your site, use /offers with filters and pagination parameters (make, model, price, year, and more)

### **GET/filters**

Provides all filterable fields and their valid values

https://{access\_name}.auto-api.com/api/v2/che168/filters?api\_key=YOUR\_API\_KEY  
Response:

{  
  "mark": {  
    "BMW": { "model": \["X5", "X3", "3 Series"\] },  
    "Audi": { "model": \["A4", "A6", "Q7"\] }  
  },  
  "transmission\_type": \["Manual", "Automatic"\],  
  "color": \["White", "Black", "Silver", "Dark Gray", "Blue", "Red", "Brown", "Orange", "Yellow", "Green", "Purple", "Champagne", "Other"\],  
  "body\_type": \["Crossover/SUV", "Sedan", "Hatchback", "Minivan", "Pickup", "Coupe/Roadster", "Microvan", "Light Truck", "Van", "Mini"\],  
  "engine\_type": \["Gasoline", "Diesel", "Electric", "Hybrid", "Plug-in Hybrid", "Range Extender", "Hydrogen Fuel Cell", "Gasoline \+ 48V Mild Hybrid", "Gasoline \+ 24V Mild Hybrid", "Gasoline \+ CNG", "CNG"\],  
  "drive\_type": \["FWD", "RWD", "AWD", "RWD (dual-motor)", "AWD (dual-motor)", "AWD (tri-motor)", "AWD (quad-motor)"\]  
}

### **GET/offers**

Paginated list of vehicle listings with filter support

#### Parameters:

* page (required) \- page number  
* mark, model, transmission\_type, color, body\_type, engine\_type \- filters (case-insensitive)  
* year\_from, year\_to \- year range filter  
* km\_age\_from, km\_age\_to \- mileage range filter  
* price\_from, price\_to \- price range filter (in CNY)

https://{access\_name}.auto-api.com/api/v2/che168/offers?api\_key=YOUR\_API\_KEY\&page=1

https://{access\_name}.auto-api.com/api/v2/che168/offers?api\_key=YOUR\_API\_KEY\&page=1\&mark=BMW\&color=black  
Response:

{  
  "result": \[  
    {  
      "id": 1273379,  
      "inner\_id": "55651236",  
      "change\_type": "added",  
      "created\_at": "2025-08-05T08:18:10.679Z",  
      "data": {  
        "id": 1273379,  
        "inner\_id": "55651236",  
        "url": "https://www.che168.com/dealer/648815/55651236.html",  
        "mark": "Lamborghini",  
        "model": "Huracán",  
        "title": "Huracán 2020 Huracán EVO RWD",  
        "year": 2020,  
        "color": "Red",  
        "price": 1890000,  
        "km\_age": 19000,  
        "engine\_type": "Gasoline",  
        "transmission\_type": "Automatic",  
        "body\_type": "Sports Car",  
        "drive\_type": "RWD (mid-engine)",  
        "address": "Shanghai, Minhang",  
        "seller\_type": "dealer",  
        "is\_dealer": true,  
        "section": "Used",  
        "salon\_id": "648815",  
        "description": "Shanghai Luxury Car Store: 166 detailed inspections...",  
        "displacement": 5.2,  
        "offer\_created": "2025-08-05",  
        "images": \["https://2sc2.autoimg.cn/escimg/auto/g34/M04/C4/EC/..."\],  
        "extra": {"inspection": {...}, "configuration": {...}},  
        "power": 610  
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
* year \- production year  
* color \- color  
* price \- price in CNY  
* km\_age \- mileage in km  
* engine\_type \- engine type  
* drive\_type \- drive type  
* transmission\_type \- transmission type  
* body\_type \- body type  
* address \- address  
* seller\_type \- seller type  
* is\_dealer \- dealer flag (true/false)  
* section \- section  
* salon\_id \- dealer ID  
* displacement \- engine displacement  
* images \- array of image URLs  
* power \- power in hp

### **GET/change\_id**

Get starting change ID for a given date (required for /changes endpoint)

#### Parameters:

* date (required) \- date in yyyy-mm-dd format

https://{access\_name}.auto-api.com/api/v2/che168/change\_id?api\_key=YOUR\_API\_KEY\&date=2025-01-15  
Response:

{ "change\_id": 3294715 }

*Use the returned value as the change\_id parameter in /changes*

### **GET/changes**

Incremental updates feed (added/changed/removed records)

#### Parameters:

* change\_id (required) \- starting from which change ID

https://{access\_name}.auto-api.com/api/v2/che168/changes?api\_key=YOUR\_API\_KEY\&change\_id=1  
Response:

{  
  "result": \[  
    {  
      "id": 456,  
      "inner\_id": "55651236",  
      "change\_type": "added",    // added \- new listing  
      "created\_at": "2025-01-15T10:30:00Z",  
      "data": { ... }            // full listing data  
    },  
    {  
      "id": 457,  
      "inner\_id": "55651237",  
      "change\_type": "changed",  // changed \- price update  
      "created\_at": "2025-01-15T10:31:00Z",  
      "data": { "new\_price": 1790000 }  
    },  
    {  
      "id": 458,  
      "inner\_id": "55651238",  
      "change\_type": "removed",  // removed \- listing deleted  
      "created\_at": "2025-01-15T10:32:00Z"  
    }  
  \],  
  "meta": { "cur\_change\_id": 1, "next\_change\_id": 21, "limit": 20 }  
}

### **GET/offer**

Detailed information for a specific listing by inner\_id

#### Parameters:

* inner\_id (required)

https://{access\_name}.auto-api.com/api/v2/che168/offer?api\_key=YOUR\_API\_KEY\&inner\_id=55651236  
*Response: single data object (same fields as /offers items, returned directly without result wrapper)*  
[Get Listing by URL](https://auto-api.com/che168#offer)  
Retrieve complete listing data by providing the che168.com URL

### **Base URL**

https://{access\_name}.auto-api.com/api/v1/offer/info

Authorization: header x-api-key

### **POST/api/v1/offer/info**

Get listing data from che168.com by URL

#### Parameters:

* url (required) \- link to the listing on che168.com

Request Example:

curl \-L 'https://{access\_name}.auto-api.com/api/v1/offer/info' \\  
  \-H 'x-api-key: YOUR\_API\_KEY' \\  
  \-H 'Content-Type: application/json' \\  
  \-d '{ "url": "https://www.che168.com/dealer/413863/56520004.html" }'

Response:

{  
  "inner\_id": "56520004",  
  "url": "https://www.che168.com/dealer/413863/56520004.html",  
  "mark": "Ora",  
  "model": "Black Cat",  
  "year": 2020,  
  "color": "White",  
  "price": 31800,  
  "km\_age": 54000,  
  "engine\_type": "Electric",  
  "transmission\_type": "Automatic",  
  "body\_type": "Mini",  
  "drive\_type": "FWD",  
  "displacement": "0",  
  "vin": "LGWECMA47LE008164",  
  "city": "Shenzhen",  
  "seller\_type": "dealer",  
  "is\_dealer": true,  
  "offer\_created": "2025-12-04",  
  "images": \[  
    "https://2sc2.autoimg.cn/escimg/auto/g33/M0B/AE/D7/1024x768\_c42\_autohomecar\_\_ChxpVWj8TteALlI3AAnIctts-w8397.jpg.webp",  
    "https://2sc2.autoimg.cn/escimg/auto/g34/M0B/A3/C5/1024x768\_c42\_autohomecar\_\_ChxpWGj8TtiAJ0EJAAq9t0PZjQc486.jpg.webp"  
  \],  
  "power": 61,  
  "first\_registration": "2020-09"  
}

#### Field Descriptions:

* inner\_id \- listing ID on che168.com  
* url \- link to the listing  
* mark \- car brand  
* model \- car model  
* year \- production year  
* color \- vehicle color  
* price \- price in CNY  
* km\_age \- mileage in kilometers  
* engine\_type \- engine/fuel type  
* transmission\_type \- transmission type  
* body\_type \- body type  
* drive\_type \- drive type (FWD, RWD, AWD)  
* displacement \- engine displacement  
* vin \- vehicle identification number  
* city \- seller city  
* seller\_type \- seller type  
* is\_dealer \- dealer flag  
* offer\_created \- listing creation date  
* images \- array of image URLs  
* power \- engine power in horsepower (hp)  
* first\_registration \- first registration date (YYYY-MM)

[Daily Exports](https://auto-api.com/che168#daily)

### **File Storage**

Files stored for 3 days minimum

### **Update Schedule**

Fresh data files generated daily and available for download

### **File Format**

CSV files use pipe symbol (|) to separate columns

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
