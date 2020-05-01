<?php

/**
 * Hooks for TCGplayer extension
 */
class TCGplayerHooks {

	private static $TCGPLAYER_API = 'http://api.tcgplayer.com/' . getenv( 'TCGPLAYER_API_VERSION' );

	private static $TCGPLAYER_API_ENDPOINT = [
		'catalog' => '/catalog/products?',
		'pricing' => '/pricing/product/',
	];

	private static $TCGPLAYER_API_HEADERS =  [
		'Accept: application/json',
		'Authorization: bearer ' . getenv( 'TCGPLAYER_BEARER_TOKEN' ),
	];

	/**
	 * Given a page name, removes the dab, returning
	 * the (simple) card name (with no hash).
	 * @param string $pagename The page name.
	 * @return string The card name (with no hash).
	 */
	private static function getCardName( string $pagename ): string {
		return explode( ' (', $pagename )[ 0 ];
	}

	/**
	 * Makes a call to the TCGplayer API.
	 * @param string $endpoint URL to request.
	 * @return array JSON API call result.
	 */
	private static function callTcgplayerApi( string $endpoint ): ?array {
		$ch = curl_init();

		curl_setopt( $ch, CURLOPT_URL, self::$TCGPLAYER_API . $endpoint );

		curl_setopt( $ch, CURLOPT_RETURNTRANSFER, 1 );

		curl_setopt( $ch, CURLOPT_CUSTOMREQUEST, 'GET' );

		curl_setopt( $ch, CURLOPT_HTTPHEADER, self::$TCGPLAYER_API_HEADERS );

		$apiRes = curl_exec( $ch );

		try {
			if ( curl_errno( $ch ) || $apiRes === false ) {
				$errorMessage = curl_error( $ch );

				throw new Exception( 'CURL Error: ' . $errorMessage );
			}

			$responseCode = curl_getinfo( $ch, CURLINFO_HTTP_CODE );

			if ( $responseCode >= 400 ) {
				throw new Exception( 'HTTP Error: ' . $responseCode );
			}
		} finally {
			curl_close( $ch );
		}

		return json_decode( $apiRes, true );
	}

	/**
	 * Gets the card IDs from the TCGplayer site.
	 * @param string $cardName The card name (no hash).
	 * @return array JSON representation of the TCGplayer API response.
	 */
	private static function callTcgplayerApiProductsId( string $cardName ): ?array {
		return self::callTcgplayerApi(
			self::$TCGPLAYER_API_ENDPOINT[ 'catalog' ] . http_build_query( [
				'productName' => $cardName,
				'limit' => 100,
				//'getExtendedFields' => true,
			] )
		);
	}

	/**
	 * Gets the card prices from the TCGplayer site, based on the ID.
	 * @param string $productId A product ID for a card.
	 * @return array JSON representation of the TCGplayer API response.
	 */
	private static function callTcgplayerApiProductsPrices( string $productId ): ?array {
		return self::callTcgplayerApi(
			self::$TCGPLAYER_API_ENDPOINT[ 'pricing' ] . $productId
		);
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/BeforePageDisplay
	 */
	public static function onBeforePageDisplay( OutputPage $out, Skin $skin ) {
		$categories = $out->getCategories();

		if ( !in_array( 'TCG cards', $categories ) ) {
			return;
		}

//		DeferredUpdates::addCallableUpdate( function() use ( $out ) {
			$jsData = [];

			$pagename = $out->getPageTitle();

			$cardName = self::getCardName( $pagename );

			try {
				$tcgplayerCardIds = self::callTcgplayerApiProductsId( $cardName );

				if ( $tcgplayerCardIds[ 'success' ] ) {
					$jsData = array_map( function( $product ): ?array { // $tcgplayerCardPrices
						return self::callTcgplayerApiProductsPrices( $product[ 'productId' ] );
					}, $tcgplayerCardIds[ 'results' ] );
				} else {
					$jsData = [
						'error' => [
							'message' => 'TCGplayer API Error: Failed to get product IDs.',
							'data' => $tcgplayerCardIds[ 'errors' ],
						],
					];
				}
			} catch ( Exception $e ) {
				$jsData = [
					'error' => [
						'message' => $e->getMessage(),
					],
				];
			}

			$jsData = json_encode( $jsData );

			$out->addScript( <<<SCRIPT
				<script>
				window.addEventListener( 'load', function() {
					mw.hook( 'ext.tcgplayerPrices' ).fire( $jsData );
				} );
				</script>
SCRIPT
			);

			$out->addModules( [ 'ext.tcgplayer' ] );
//		} );
	}

}