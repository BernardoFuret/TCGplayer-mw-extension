<?php

/**
 * Hooks for TCGplayer extension
 */
class TCGplayerHooks {

	/**
	 * Register JS module to call for TCGplayer prices only if it's a TCG card.
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/BeforePageDisplay
	 */
	public static function onBeforePageDisplay( OutputPage $out, Skin $skin ) {
		$categories = $out->getCategories();

		if ( in_array( 'TCG cards', $categories ) ) {
			$out->addModules( [ 'ext.tcgplayer' ] );
		}
	}

}