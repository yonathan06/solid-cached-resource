import { cleanup, render, screen } from "@solidjs/testing-library";
import type { Component } from "solid-js";
import { For } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { createCachedResource } from "../src/index";

const MockData = [{ id: 1, name: "test" }];

const MyComp: Component = () => {
	const [data] = createCachedResource(["key"], async () => {
		return MockData;
	});
	return (
		<div>
			<For each={data()}>
				{(item) => <div data-testid={item.id}>{item.name}</div>}
			</For>
		</div>
	);
};

describe("Test lib", () => {
	afterEach(cleanup);

	it("Should render", async () => {
		render(() => <MyComp />);
		await new Promise(resolve => setTimeout(resolve, 0));
		for (const d of MockData) {
			const div = screen.getByTestId(d.id);
			expect(div).toBeTruthy();
			expect(div.textContent).equals(d.name);
		}
	});
});
