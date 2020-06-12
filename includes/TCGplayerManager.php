<?php

/**
 * TCGplayer API manager.
 */
class TCGplayerManager {

	private $TCGPLAYER_API;

	private $TCGPLAYER_API_ENDPOINT;

	private $TCGPLAYER_API_HEADERS;

	/**
	 * Initialize properties. 
	 */
	public function __construct() {
		global
			$tcgplayerConfigApiVersion,
			$tcgplayerConfigBearerToken
		;

		$this->TCGPLAYER_API = 'https://api.tcgplayer.com/' . $tcgplayerConfigApiVersion;

		$this->TCGPLAYER_API_ENDPOINT = [
			'catalog' => '/catalog/products?',
			'pricing' => '/pricing/product/',
		];

		$this->TCGPLAYER_API_HEADERS = [
			'Accept: application/json',
			'Authorization: bearer ' . $tcgplayerConfigBearerToken,
		];
	}

	/**
	 * Makes a call to the TCGplayer API.
	 * @param string $endpoint URL to request.
	 * @return array JSON API call result.
	 */
	private function callApi( string $endpoint ): ?array {
		$ch = curl_init();

		curl_setopt( $ch, CURLOPT_URL, $this->TCGPLAYER_API . $endpoint );

		curl_setopt( $ch, CURLOPT_RETURNTRANSFER, 1 );

		curl_setopt( $ch, CURLOPT_CUSTOMREQUEST, 'GET' );

		curl_setopt( $ch, CURLOPT_HTTPHEADER, $this->TCGPLAYER_API_HEADERS );

		$apiRes = curl_exec( $ch );

		try {
			if ( curl_errno( $ch ) || $apiRes === false ) {
				$errorMessage = curl_error( $ch );

				throw new Exception( 'CURL Error: ' . $errorMessage . ' On: ' . $endpoint );
			}

			$responseCode = curl_getinfo( $ch, CURLINFO_HTTP_CODE );

			if ( $responseCode >= 400 ) {
				throw new Exception( 'HTTP Error: ' . $responseCode . ' On: ' . $endpoint );
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
	public function callApiProductsId( string $cardName ): ?array {
		return $this->callApi(
			$this->TCGPLAYER_API_ENDPOINT[ 'catalog' ] . http_build_query( [
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
	public function callApiProductsPrices( string $productId ): ?array {
		return $this->callApi(
			$this->TCGPLAYER_API_ENDPOINT[ 'pricing' ] . $productId
		);
	}

}