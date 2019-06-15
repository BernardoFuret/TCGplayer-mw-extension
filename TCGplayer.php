<?php
/**
 * Hooks for TCGplayer extension
 */
class TCGplayer {

	public static function onBeforePageDisplay( OutputPage $out, Skin $skin ) {
		$out->addModules( [ "ext.tcgplayer" ] );
	}

}