package com.crabsense.ras.block;

import net.minecraft.util.StringRepresentable;

/** Which T sockets sit on the incoming pipe: the two bar ends, or the stem. */
public enum PipePort implements StringRepresentable {
	SIDES,
	STEM;

	@Override
	public String getSerializedName() {
		return name().toLowerCase();
	}

	public PipePort other() {
		return this == SIDES ? STEM : SIDES;
	}
}
