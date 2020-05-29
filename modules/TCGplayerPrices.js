/**
 * TCGplayerPrices
 * Queries the server for the TCGplayer prices
 * for this card. Handles the results and their
 * insertion into the page.
 * This JS module is only loaded if the card is
 * released in the TCG. Thus, that check is not
 * done here, but by the backend.
 */
( function __extTCGplayerPrices( window, $, mw, console ) {
	"use strict";

	var config = mw.config.get( [
		'wgTitle',
	] );

	var api;

	function getCardName() {
		return config.wgTitle.split( /\s*\(/g )[ 0 ].replace( /@/, '' );
	}

	function getTCGplayerPrices() {
		return api.get( {
			action: 'tcgplayerprices',
			card: getCardName(),
		} );
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
			utm_campaign: 'affiliate',
			utm_medium: 'yugipedia',
			utm_source: 'yugipedia',
		} ) );
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
									+
									this.mid.length
									+
									this.high.length
								);
							}
						}/*,*/
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
		}/*,*/
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

	function makeDataRow( editionLabel, editionPrices ) {
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
							text: prices.length
								? priceRangeCalculations[ priceRange ]( prices ).toFixed( 2 )
								: 'N/A'
							,
						} ),
					} ),
				} )
			);
		}, $( '<tr>', {
			'class': 'tcgplayer__data--row',
			html: $( '<th>', {
				text: editionInfo[ editionLabel ].name,
			} ),
		} ) );
	}

	/** Execution flow */

	function flow( $content ) {
		return getTCGplayerPrices()
			.then( function( apiResponse ) {
				if ( apiResponse.error ) {
					throw new Error( apiResponse.error.message );
				}

				return apiResponse.tcgplayerprices;
			} )
			.then( function( allPricesApiResults ) {
				return allPricesApiResults.reduce( function( prices, productPrices ) {
					if ( productPrices.errors.length ) {
						console.warn( '[ext.TCGplayer] - Error on', productPrices, productPrices.errors );

						return prices;
					}

					return productPrices.results.reduce( function( prices, editionPrice ) {
						return prices.add(
							editionHash[ editionPrice.subTypeName ] || hash( 'O' ), // TODO
							editionPrice.lowPrice,
							editionPrice.midPrice,
							editionPrice.highPrice/*,*/
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
						'tcgplayer__data',
					].join( ' ' ),
				} );

				var $caption = $( '<caption>', {
					html: $( '<a>', {
						rel: 'nofollow',
						href: 'https://www.tcgplayer.com/',
						text:'TCGplayer',
					} ),
				} ).append( ' Prices' );

				var $header = $( '<tr>', { 'class': 'tcgplayer__header' } )
					.append( $( '<th>', {
						'class': 'tcgplayer__header--empty',
						html: '&nbsp;',
					} ) )
					.append( $( '<th>', { text: 'Low' } ) )
					.append( $( '<th>', { text: 'Medium' } ) )
					.append( $( '<th>', { text: 'High' } ) )
				;

				$table
					.append( $caption )
					.append( $header )
				;

				Object.keys( prices ).forEach( function( editionLabel ) {
					makeDataRow( editionLabel, prices[ editionLabel ] )
						.appendTo( $table )
					;
				} );

				$content
					.find( '#tcgplayer' )
						.append( $table )
						.show()
				;

				return prices;
			} )
			.then( mw.log )
			[ 'catch' ]( console.warn.bind( console, '[ext.TCGplayer] -' ) )
		;
	}

	mw.loader.using( 'mediawiki.api' ).then( function() {
		api = new mw.Api();

		mw.hook( 'wikipage.content' ).add( flow );
	} );

} )( window, window.jQuery, window.mediaWiki, window.console );
