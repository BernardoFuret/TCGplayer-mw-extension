# TCGplayer-mw-extension

Extension to display TCG cards' prices on their respective articles.

It makes use of the TCGplayer API.

## Configuration
The file `TCGplayerConfig.php` contains the configuration settings:
* `$tcgplayerConfigApiVersion`: __Required__. Defines the TCGplayer API version to use.
* `$tcgplayerConfigBearerToken`: __Required__. Bearer token to allow querying the TCGplayer API.

This file should be located in the same folder as the file `LocalSettings.php`. Then, just add to LocalSettings.php:

```php
require_once 'TCGplayerConfig.php';

wfLoadExtension( 'TCGplayer' );
```

If the configuration file is located elsewhere, just use the path to the configuration file.