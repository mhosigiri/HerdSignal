# Elephant Conservation Datasets — Download Guide

## Found via Browser Search

### Kaggle Datasets

| Dataset | URL | Format | Size | Content |
|---------|-----|--------|------|---------|
| African Elephant Census Data | Search kaggle.com for "elephant population" | CSV | TBD | Population counts by country |
| Elephant GPS Tracking | Search kaggle.com for "elephant GPS tracking" | CSV/GeoJSON | TBD | Movement coordinates |
| Poaching Incidents | Search kaggle.com for "elephant poaching" | CSV | TBD | Geolocated incidents |

**To download from Kaggle:**
1. Go to https://www.kaggle.com/settings/account
2. Click "Create New API Token" → downloads `kaggle.json`
3. Place at `~/.kaggle/kaggle.json`
4. `kaggle datasets download -d <dataset-ref> -p downloaded_data/`

### HuggingFace Datasets

| Dataset | URL | Requires Auth |
|---------|-----|--------------|
| Elephant Sound Classification | huggingface.co/datasets/payload123/elephant_sound_classification | Yes |
| Animals with Attributes | huggingface.co/datasets/ethz-atlantis/animals_with_attributes_2 | Yes |

**To download from HuggingFace:**
1. Create token at https://huggingface.co/settings/tokens
2. `huggingface-cli login`
3. `huggingface-cli download <dataset> --local-dir downloaded_data/`

### Public Data Sources (No Auth Required)

| Source | URL | Content |
|--------|-----|---------|
| CITES Trade Database | https://trade.cites.org/ | Ivory trade records since 1975 |
| IUCN Red List API | https://apiv3.iucnredlist.org/api/v3/species/12392 | Population status |
| African Elephant Database | https://www.elephantdatabase.org/ | Population estimates |
| Elephant Listening Project | https://www.elephantlisteningproject.org/ | Audio + habitat data |
| Congo Soundscapes (AWS) | s3://congo8khz-pnnn | Forest elephant audio |
| MIKE Programme | https://www.cites.org/eng/prog/mike/ | Poaching monitoring |
| ETIS Trade Database | https://etis.cites.org/ | Ivory seizure data |
| Save the Elephants | https://www.savetheelephants.org/data/ | GPS tracking data |
| Amboseli Elephant Research | https://www.amboselielephants.org/ | Long-term population data |

## Manual Download Script

```bash
#!/bin/bash
DEST="~/Desktop/HackSMU/downloaded_data"
mkdir -p "$DEST"/{gis,conservation,habitat,migration,audio}

# Congo Soundscapes (public S3)
aws s3 sync s3://congo8khz-pnnn "$DEST/audio/congo_soundscapes/" \
  --no-sign-request --region us-west-2

echo "Check $DEST for downloads"
```
