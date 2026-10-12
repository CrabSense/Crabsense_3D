package com.crabsense.ras.block;

import net.minecraft.util.StringRepresentable;

/** PVC sizes used in the RAS CAD: box surface 27, box bottom 34, drum 60. */
public enum PipeSize implements StringRepresentable {
	DN27(27, 0.72f),
	DN34(34, 0.91f),
	DN60(60, 1.60f);

	private final int mm;
	private final float units;

	PipeSize(int mm, float units) {
		this.mm = mm;
		this.units = units;
	}

	public int mm() {
		return mm;
	}

	/** Outer diameter in Minecraft model units (16 = one block). */
	public float units() {
		return units;
	}

	@Override
	public String getSerializedName() {
		return Integer.toString(mm);
	}

	public static PipeSize fromMm(int mm) {
		PipeSize best = DN34;
		int gap = Integer.MAX_VALUE;
		for (PipeSize size : values()) {
			int d = Math.abs(size.mm - mm);
			if (d < gap) {
				gap = d;
				best = size;
			}
		}
		return best;
	}
}
