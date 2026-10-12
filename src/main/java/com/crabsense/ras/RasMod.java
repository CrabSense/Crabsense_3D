package com.crabsense.ras;

import com.crabsense.ras.block.RasBlockEntities;
import com.crabsense.ras.block.RasBlocks;
import net.fabricmc.api.ModInitializer;
import net.minecraft.resources.Identifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class RasMod implements ModInitializer {
	public static final String MOD_ID = "crabsense_ras";
	public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

	@Override
	public void onInitialize() {
		RasBlocks.register();
		RasBlockEntities.register();
		LOGGER.info("[CrabSense RAS] registered {} blocks", RasBlocks.ALL.size());
	}

	public static Identifier id(String path) {
		return Identifier.fromNamespaceAndPath(MOD_ID, path);
	}
}
