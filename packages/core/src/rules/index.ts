import type { Diagnostic, Rule, RuleSeverityOverride, ToolDefinition } from "../types/index.js";
import { ts001UnclearPurpose } from "./ts001-unclear-purpose.js";
import { ts002UnstatedLimitations } from "./ts002-unstated-limitations.js";
import { ts003MissingUsageGuidelines } from "./ts003-missing-usage-guidelines.js";
import { ts004OpaqueParameters } from "./ts004-opaque-parameters.js";
import { ts005MissingExamples } from "./ts005-missing-examples.js";
import { ts006MissingErrorGuidance } from "./ts006-missing-error-guidance.js";
import { ts101SchemaMissingType } from "./ts101-schema-missing-type.js";
import { ts102SchemaMissingDescription } from "./ts102-schema-missing-description.js";
import { ts103SchemaUnsupportedKeywords } from "./ts103-schema-unsupported-keywords.js";
import { ts104SchemaPermissiveTypes } from "./ts104-schema-permissive-types.js";
import { ts105SchemaMissingRequired } from "./ts105-schema-missing-required.js";

/**
 * All built-in rules. New rules are registered here.
 */
const BUILT_IN_RULES: Rule[] = [
	ts001UnclearPurpose,
	ts002UnstatedLimitations,
	ts003MissingUsageGuidelines,
	ts004OpaqueParameters,
	ts005MissingExamples,
	ts006MissingErrorGuidance,
	ts101SchemaMissingType,
	ts102SchemaMissingDescription,
	ts103SchemaUnsupportedKeywords,
	ts104SchemaPermissiveTypes,
	ts105SchemaMissingRequired,
];

export interface RuleRegistryOptions {
	/** Per-rule severity overrides. Set to "off" to disable a rule. */
	overrides?: Record<string, RuleSeverityOverride>;
}

/**
 * The RuleRegistry holds all active rules and runs them against tool definitions.
 * It applies severity overrides from configuration and filters disabled rules.
 */
export class RuleRegistry {
	private rules: Rule[];
	private overrides: Record<string, RuleSeverityOverride>;

	constructor(options: RuleRegistryOptions = {}) {
		this.overrides = options.overrides ?? {};
		this.rules = BUILT_IN_RULES.filter((rule) => this.overrides[rule.meta.id] !== "off");
	}

	/** Get metadata for all active rules */
	getActiveRules(): Rule["meta"][] {
		return this.rules.map((r) => r.meta);
	}

	/** Run all active rules against a single tool definition */
	analyse(tool: ToolDefinition): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];

		for (const rule of this.rules) {
			const results = rule.check(tool);
			for (const diag of results) {
				// Apply severity override if configured
				const override = this.overrides[rule.meta.id];
				if (override && override !== "off") {
					diagnostics.push({ ...diag, severity: override });
				} else {
					diagnostics.push(diag);
				}
			}
		}

		return diagnostics;
	}

	/** Run all active rules against multiple tool definitions */
	analyseAll(tools: ToolDefinition[]): Diagnostic[] {
		return tools.flatMap((tool) => this.analyse(tool));
	}
}

export { BUILT_IN_RULES };
