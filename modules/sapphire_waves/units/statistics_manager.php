<?php

class SapphireWavesStatisticsManager extends ItemManager {
	private static $_instance;

	/**
	 * Constructor
	 */
	protected function __construct() {
		parent::__construct('sapphire_waves_statistics');

		$this->addProperty('id', 'int');
		$this->addProperty('user', 'int');
		$this->addProperty('usage', 'int');
		$this->addProperty('timestamp', 'date');
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
