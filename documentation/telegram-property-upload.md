# Uploading a Property Through Telegram

Use the Telegram bot to create a property record, then attach one or more photos to it.

## 1. Create the property

Send this command to the bot:

```text
/newproperty Property title | Price | Location
```

For example:

```text
/newproperty Luxury 3-Bedroom Duplex | ₦85,000,000 | Lekki, Lagos
```

The bot replies with the new property's ID. Copy this ID; it is required when uploading photos or updating the property.

## 2. Upload a photo

Send the property image to the bot as a **photo** (not as a document). Add this caption before sending it:

```text
PROPERTY_ID | Image title | Short subtitle | Full property description
```

Example:

```text
abc123 | Luxury Duplex Exterior | Lekki, Lagos | Modern 3-bedroom duplex with spacious rooms and parking.
```

Replace `abc123` with the property ID returned in step 1. The bot saves the image and links it to that property. Repeat this step for every additional image, using the same property ID.

## 3. Add or update property details

Use the following commands, replacing `PROPERTY_ID` with the ID returned by the bot:

```text
/propertydescription PROPERTY_ID | A modern family home in a secure Lekki estate.
/propertyfeatures PROPERTY_ID | 3 bedrooms, 4 bathrooms, parking, 24-hour security
/editproperty PROPERTY_ID | price | ₦90,000,000
/editproperty PROPERTY_ID | location | Victoria Island, Lagos
```

To mark the listing as sold:

```text
/soldproperty PROPERTY_ID
```

## Useful commands

```text
/listproperties
/editproperty PROPERTY_ID | field | value
/deleteproperty PROPERTY_ID
/propertyhelp
```

If you upload a photo without a property ID in its caption, the bot creates a basic property automatically. Create the property first when you need to set its title, price, location, and full details.
