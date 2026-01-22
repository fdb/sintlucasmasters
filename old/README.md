# 11ty

The master websites are created in 11ty. We have a folder per year.

## Installation

```bash
npm install
```

## Development

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Preparing the data for the website

Once all submissions have been done in the Google Form, we can do a couple of steps:

- Download the data from the Google Form as a CSV file. Place it in the root, e.g. 22-23.csv
- Rewrite the header row to use the correct headers (see below)
- Run the csv_to_markdown script to convert the CSV to the correct markdown files. Adapt the file to make sure they are stored in the correct folder.
- Download all images from the Google Form and place them in the \_uploads folder. There is a script, `download_image_uploads.mjs` that can do this automatically. However, Google might rate-limit you if you download too many images at once. In that case, you can download them manually.
- Make sure the names of the images are the same as the "slugs" of the students, e.g. `jane-doe.jpg` for `jane-doe.md`.
- Manually upload the images to [Uploadcare](https://uploadcare.com/).
- Run the `convert_to_uploadcare.mjs` script with the CSV file as an argument to convert the names to Uploadcare UUIDs. This will also update the markdown files for the students.

This is what the header row should look like:

```
timestamp,email,name,gsm,context,project_title,summary,website,main_image,main_caption,description,images,instagram
```
