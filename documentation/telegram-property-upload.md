# Easy property upload flow in Telegram

The bot now supports a simple reply-and-response flow.

## 1. Start the flow

Send:

```text
/newproperty
```

The bot replies and asks one question at a time.

It will ask for:

1. property title
2. price
3. location
4. description
5. features

Then it saves the property and gives you the property ID.

## 2. Add the main photo

After the property is created in the /newproperty flow, the bot will ask you to send the main photo.

Send the photo normally as a normal Telegram photo message. You do not need to type any pipe characters or commands.

If you want, you can add a short caption after the image, for example:

```text
Main villa exterior
```

or

```text
Luxury villa in Lekki
```

## 3. Review and update

Use these when needed:

```text
/listproperties
/propertydescription abc123 | Modern 4-bedroom villa with pool and security.
/propertyfeatures abc123 | 4 bedrooms, 3 bathrooms, parking, pool, security
/soldproperty abc123
```

## Best simple flow

1. /newproperty
2. reply with title
3. reply with price
4. reply with location
5. reply with description
6. reply with features
7. send the property photo normally
8. optionally add a simple caption like “Main exterior”
9. /listproperties

This reply-and-response flow is much easier for staff who do not want to memorize command syntax or pipe-delimited captions.
