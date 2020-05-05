<?php

/**
 * Add a TCGplayerPrices endpoint to the Yugipedia API.
 */
class ApiTCGplayerPrices extends ApiBase {

	private $tcgplayer;

	/**
	 * Override constructor to allow storing an instance of
	 * the `TCGplayerManager`.
	 * @see ApiBase::__construct()	 
	 */
	public function __construct( ApiMain $mainModule, $moduleName ) {
		parent::__construct( $mainModule, $moduleName );

		$this->tcgplayer = new TCGplayerManager();
	}
  
	/**
	 * Override abstract method `execute`.
	 * @see ApiBase::execute()
	 */
	public function execute() {
		$parameters = $this->extractRequestParams();

		$cardName = $parameters[ 'card' ];

		$resultData = [];

		try {
			$tcgplayerCardIds = $this->tcgplayer->callApiProductsId( $cardName );

			if ( $tcgplayerCardIds[ 'success' ] ) {
				$resultData = array_map( function( $product ): ?array {
					return $this->tcgplayer->callApiProductsPrices( $product[ 'productId' ] );
				}, $tcgplayerCardIds[ 'results' ] );
			} else {
				$resultData = [
					'error' => [
						'message' => 'TCGplayer API Error: Failed to get product IDs.',
						'data' => $tcgplayerCardIds[ 'errors' ],
					],
				];
			}
		} catch ( Exception $e ) {
			$resultData = [
				'error' => [
					'message' => $e->getMessage(),
				],
			];
		}

		$this->getResult()->addValue( null, $this->getModuleName(), $resultData );
	}

	/**
	 * List all the valid parameters for this endpoint.
	 * @see ApiBase::getAllowedParams()
	 */
	public function getAllowedParams() {
		return [
			'card' => [
				ApiBase::PARAM_TYPE => 'string',
				ApiBase::PARAM_REQUIRED => true,
			],
		];
	}

	protected function getExamplesMessages() {
		return [
			'action=tcgplayerprices&card=Tragoedia' => 'apihelp-tcgplayerprices-example',
		];
	}
}