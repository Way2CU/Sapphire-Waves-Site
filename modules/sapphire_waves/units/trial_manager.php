<?php

/**
 * Sapphire Waves Trial Manager
 *
 * Author: Mladen Mijatov
 */

class SapphireWavesTrialManager extends ItemManager {
	private static $_instance;

	/**
	 * Constructor
	 */
	protected function __construct() {
		parent::__construct('sapphire_waves_trial');

		$this->addProperty('id', 'int');
		$this->addProperty('address', 'varchar');
		$this->addProperty('times_used', 'int');
		$this->addProperty('timestamp', 'int');
	}

	/**
	 * Public function that creates a single instance
	 */
	public static function getInstance() {
		if (!isset(self::$_instance))
			self::$_instance = new self();

		return self::$_instance;
	}
}

?>
