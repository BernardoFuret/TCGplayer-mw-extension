

( function( window, $, mw, console ) {
	"use strict";

	var config = mw.config.get( [
		'wgArticleId',
		'wgPageName',
	] );

	var bearerToken = '';

	var bearerAuth = 'bearer '.concat( bearerToken );

	var api = new mw.Api();

	function getCardName() {
		return config.wgPageName.replace( /_/g, ' ' ).split( /\s*\(/g )[ 0 ];
	}

	function getTCGplayerUrl() {
		return 'https://shop.tcgplayer.com/yugioh/product/show?'.concat( $.param( {
			newSearch: false,
			IsProductNameExact: false,
			ProductName: getCardName(),
			Type: 'Cards',
			condition: 'Near_Mint',
			orientation: 'list',
			partner: 'yugipedia',
		} ) );
	}

	function getTCGplayerApiUrl( apiType ) {
		return 'https://api.tcgplayer.com/v1.27.0/'.concat( apiType );
	}

	function callTCGplayerApi( url, data ) {
		return $.ajax( url, {
			crossDomain: true,
			headers: {
				'Accept': 'application/json',
				'Authorization': bearerAuth,
			},
			data: data || JSON.stringify( false ),
		} );
	}

	function getTCGplayerApiProductsId() {
		return callTCGplayerApi( getTCGplayerApiUrl( 'catalog/products' ), {
			'productName': getCardName(),
			'limit': 100,
		} );
	}

	function getTCGplayerApiPrices( productId ) {
		return callTCGplayerApi(
			getTCGplayerApiUrl(
				'pricing/product/'.concat( productId )
			)
		);
	}

	function hash( label, isUltimate ) {
		return {
			isUltimate: isUltimate,
			toString: function() {
				return label;
			},
		};
	}

	var editionHash = {
		'1st Edition': hash( '1E' ),
		'Unlimited': hash( 'UE' ),
		'Limited': hash( 'LE' ),
		//'Promo': hash( 'P' ),
		'1st Edition - Ultimate': hash( '1E', true ),
		'Unlimited - Ultimate': hash( 'UE', true ),
	};

	var editionInfo = {
		'1E': {
			name: '1st Edition',
			cssClass: '1st-edition',
		},
		'UE': {
			name: 'Unlimited Edition',
			cssClass: 'unlimited-edition',
		},
		'LE': {
			name: 'Limited Edition',
			cssClass: 'limited-edition',
		},
		/*'P': {
			name: 'Promo',
			cssClass: 'promo',
		},*/
		'O': { // TODO
			name: 'Other',
			cssClass: 'other',
		},
	};

	var Prices = Object.defineProperty(
		{
			get: function( edition ) {
				return this[ edition ] || (
					this[ edition ] = Object.defineProperty(
						{
							low: [],
							mid: [],
							high: [],
						},
						'length',
						{
							get: function() {
								return (
									this.low.length
									+ this.mid.length
									+ this.high.length
								);
							}
						},
					)
				);
			},
			add: function( edition, low, mid, high ) {
				if ( !edition.isUltimate && low !== null ) {
					this.get( edition ).low.push( low );
				}

				if ( !edition.isUltimate && mid !== null ) {
					this.get( edition ).mid.push( mid );
				}

				if ( high !== null ) {
					this.get( edition ).high.push( high );
				}

				return this;
			}
		},
		'length',
		{
			get: function() {
				return Object.keys( this ).reduce( function( length, edition ) {
					return length + this.get( edition ).length;
				}.bind( this ), 0 );
			}
		},
	);

	var priceRangeCalculations = {
		low: function( prices ) {
			return Math.min.apply( Math, prices );
		},
		mid: function( prices ) {
			return Math.min.apply( Math, prices );
		},
		high: function( prices ) {
			return Math.max.apply( Math, prices );
		},
	};

	/** Design & Interface */

	function makeHeader( editionLabel ) {
		return $( '<tr>', {
			html: $( '<th>', {
				colspan: '3',
				text: editionInfo[ editionLabel ].name,
			} ),
		} );
	}

	function makeData( editionLabel, editionPrices ) {
		return Object.entries( editionPrices ).reduce( function( $tr, priceInfo ) {
			var priceRange = priceInfo[ 0 ];

			var prices = priceInfo[ 1 ];

			return $tr.append(
				$( '<td>', {
					html: $( '<span>', {
						'class': 'tcgplayer__data__' + editionInfo[ editionLabel ].cssClass,
						id: 'tcgplayer__data__' + editionInfo[ editionLabel ].cssClass + '--' + priceRange,
						html: $( '<a>', {
							rel: 'nofollow',
							'class': [
								'external',
								'text'
							].join( ' ' ),
							href: getTCGplayerUrl(),
							text: prices.length ? priceRangeCalculations[ priceRange ]( prices ) : 'N/A',
						} ),
					} ),
				} )
			);
		}, $( '<tr>', {
			'class': 'tcgplayer__data',
		} ) );
	}

	/** Execution flow */

	function flow( $content ) {
		return Promise.resolve()
			.then( function() {
				return api.get( {
					action: 'query',
					prop: 'categories',
					titles: config.wgPageName,
					format: 'json',
					cllimit: 50,
				} );
			} )
			.then( function( res ) {
				var thisPageData = res.query.pages[ config.wgArticleId ];

				if ( !thisPageData || !thisPageData.categories ) {
					throw new Error( 'Failed to get categories for this page.' );
				}

				return thisPageData.categories.some( function( c ) {
					return c.title === 'Category:TCG cards';
				} );
			} )
			.then( function( isTcgCard ) {
				if ( isTcgCard ) {
					return getTCGplayerApiProductsId();
				} else {
					throw new Error( 'Not a TCG card.' ); // TODO: branch here.
				}
			} )
			.then( function( res ) {
				if ( !res.success ) {
					throw new Error( 'Failed to get product IDs:', res.errors );
				}

				return res.results.map( function( product ) {
					return getTCGplayerApiPrices( product.productId );
				} );
			} )
			.then( Promise.all.bind( Promise ) )
			.then( function( allRes ) {
				return allRes.reduce( function( prices, productPrices ) {
					if ( !productPrices.success ) {
						console.warn( 'Error on', productPrices, productPrices.errors );

						return prices;
					}

					return productPrices.results.reduce( function( prices, editionPrice ) {
						return prices.add(
							editionHash[ editionPrice.subTypeName ] || hash( 'O' ), // TODO
							editionPrice.lowPrice,
							editionPrice.midPrice,
							editionPrice.highPrice,
						);
					}, prices );
				}, Object.create( Prices ) );
			} )
			.then( function( prices ) {
				if ( !prices.length ) {
					throw new Error( 'No prices found.' );
				}

				var $table = $( '<table>', {
					'class': [
						'wikitable',
						'plainlinks',
						'tcgplayer',
					].join( ' ' ),
					html: $( '<caption>', {
						html: $( '<a>', {
							rel: 'nofollow',
							href: 'https://www.tcgplayer.com/',
							text:'TCGplayer',
						} ),
					} ).append( ' Prices' ),
				} );

				Object.keys( prices ).forEach( function( editionLabel ) {
					var $header = makeHeader( editionLabel );

					var $labels = [ 'Low', 'Medium', 'High' ].reduce( function( $tr, priceRange ) {
						return $tr.append(
							$( '<th>', {
								text: priceRange,
							} )
						);
					}, $( '<tr>' ) );

					var $data = makeData( editionLabel, prices[ editionLabel ] );

					$table
						.append( $header )
						.append( $labels )
						.append( $data )
					;
				} );

				$content.find( '.cardtable-cardimage' ).append( $table );

				return prices;
			} )
			.then( mw.log )
			[ 'catch' ]( console.warn.bind( console, '[ext.TCGplayer] -' ) )
		;
	}

	mw.hook( 'wikipage.content' ).add( flow );

} )( window, window.jQuery, window.mediaWiki, window.console );
