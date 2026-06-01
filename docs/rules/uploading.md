# Rules

## Later
- cleanup the loading state

## On Confirm Upload
- if an individual upload file fails, what do we do?

## Done
## On Add File
- If the file is greater than 7 MB, we reject it
- If it is not a TXT, Doc, docx, or pdf, we don't allow it to be uploaded

## On Add File
- We show the user the file in a list
- They have a button that let's them trigger the order

## On Confirm Upload
- We create an Order
- We show a status for each file as we:
- We work through one file at a time to:
    - Create a supabase URL
    - Upload the raw file to supabase
    - create a file in our DB
- On complete:
    - refresh the orders.list stuff
    - clear out the files
    - launch the trigger order job
