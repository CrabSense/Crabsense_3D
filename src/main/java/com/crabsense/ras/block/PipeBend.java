package com.crabsense.ras.block;

import net.minecraft.util.StringRepresentable;

public enum PipeBend implements StringRepresentable {
	LEFT,
	RIGHT,
	UP,
	DOWN;

	@Override
	public String getSerializedName() {
		return name().toLowerCase();
	}

	public PipeBend next() {
		return values()[(ordinal() + 1) % values().length];
	}
}
