package com.crabsense.ras.block;

import net.minecraft.util.StringRepresentable;

/** Where a fitting sits: mid-air, on a crab-box face, or continuing that pipe. */
public enum PipeMount implements StringRepresentable {
	AIR,
	BOX,
	LINE;

	@Override
	public String getSerializedName() {
		return name().toLowerCase();
	}
}
