"use client";

import { Search, X } from "lucide-react";
import Input, { type InputProps } from "./Input";
import IconButton from "./IconButton";

interface Props extends Omit<InputProps, "iconLeft" | "type"> {
	onClear?: () => void;
}

export default function SearchInput({
	onClear,
	value,
	placeholder = "Search",
	...rest
}: Props) {
	const showClear = Boolean(onClear && value);

	return (
		<Input
			type="search"
			value={value}
			placeholder={placeholder}
			iconLeft={<Search size={14} />}
			iconRight={
				showClear ? (
					<IconButton label="Clear" size="sm" onClick={onClear}>
						<X size={14} />
					</IconButton>
				) : undefined
			}
			{...rest}
		/>
	);
}
