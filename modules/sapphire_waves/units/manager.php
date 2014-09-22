<?php

/**
 * Sapphire Waves User Manager
 *
 * Manager used for storing and retreiving data related to 
 * system users.
 *
 * Author: Mladen Mijatov
 */

class SapphireWavesManager extends ItemManager {
	private static $_instance;

	/**
	 * Constructor
	 */
	protected function __construct() {
		parent::__construct('sapphire_waves');

		$this->addProperty('id', 'int');
		$this->addProperty('type', 'int');
		$this->addProperty('user', 'int');
		$this->addProperty('referral', 'int');
		$this->addProperty('remaining_time', 'int');
		$this->addProperty('total_time', 'int');
		$this->addProperty('expires', 'timestamp');
		$this->addProperty('active', 'boolean');
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
