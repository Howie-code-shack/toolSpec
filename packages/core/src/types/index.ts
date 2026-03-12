/**
 * Core type definitions for ToolSpec.
 *
 * These types model MCP tool definitions, diagnostics produced by lint rules,
 * quality scores, and the rule system itself. They are the shared contract
 * between @toolspec/core, @toolspec/cli, and @toolspec/mcp-loader.
 */

// ---------------------------------------------------------------------------
// JSON Schema (lightweight subset — we don't model the full spec, just what
// MCP tool schemas actually use)
// ---------------------------------------------------------------------------

export interface JSONSchemaProperty {
	type?: string | string[];
	description?: string;
	enum?: unknown[];
	default?: unknown;
	items?: JSONSchemaProperty;
	properties?: Record<string, JSONSchemaProperty>;
	required?: string[];
	additionalProperties?: boolean | JSONSchemaProperty;
	anyOf?: JSONSchemaProperty[];
	oneOf?: JSONSchemaProperty[];
	allOf?: JSONSchemaProperty[];
	$ref?: string;
	format?: string;
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	[key: string]: unknown;
}

export interface JSONSchema extends JSONSchemaProperty {
	type: "object";
	properties?: Record<string, JSONSchemaProperty>;
	required?: string[];
}

// ---------------------------------------------------------------------------
// MCP Tool Annotations (from MCP spec 2025-03-26)
// ---------------------------------------------------------------------------

export interface ToolAnnotations {
	title?: string;
	readOnlyHint?: boolean;
	destructiveHint?: boolean;
	idempotentHint?: boolean;
	openWorldHint?: boolean;
}

// ---------------------------------------------------------------------------
// Tool Definition — the primary input to the engine
// ---------------------------------------------------------------------------

export interface ToolDefinition {
	/** Name of the MCP server this tool belongs to */
	serverName: string;
	/** Version of the MCP server, if known */
	serverVersion?: string;
	/** Tool name as exposed via tools/list */
	name: string;
	/** Natural-language description of the tool */
	description?: string;
	/** JSON Schema for the tool's input parameters */
	inputSchema: JSONSchema;
	/** JSON Schema for the tool's output (optional in MCP spec) */
	outputSchema?: JSONSchema;
	/** MCP tool annotations */
	annotations?: ToolAnnotations;
	/** How this definition was loaded */
	source: "file" | "stdio" | "http" | "registry";
	/** File path, URL, or command used to load this definition */
	sourcePath?: string;
}

// ---------------------------------------------------------------------------
// Smell Categories (from the academic taxonomy)
// ---------------------------------------------------------------------------

export type SmellCategory =
	| "unclear-purpose"
	| "unstated-limitations"
	| "missing-usage-guidelines"
	| "opaque-parameters"
	| "missing-examples"
	| "missing-error-guidance"
	| "schema-structural"
	| "metadata";

// ---------------------------------------------------------------------------
// Diagnostics — output of lint rules
// ---------------------------------------------------------------------------

export type Severity = "error" | "warning" | "info";

export interface TokenImpact {
	/** Approximate token count of the current description */
	current: number;
	/** Approximate token count of the suggested description */
	suggested: number;
}

export interface Diagnostic {
	/** Rule that produced this diagnostic (e.g. "TS001") */
	ruleId: string;
	/** Severity level */
	severity: Severity;
	/** Which smell category this falls under */
	category: SmellCategory;
	/** Name of the tool this diagnostic applies to */
	toolName: string;
	/** Name of the server the tool belongs to */
	serverName: string;
	/** Human-readable explanation */
	message: string;
	/** Suggested fix, if available */
	suggestion?: string;
	/** Token cost comparison for description changes */
	tokenImpact?: TokenImpact;
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

export interface ToolScore {
	toolName: string;
	serverName: string;
	/** Overall quality score 0–100 */
	score: number;
	/** Breakdown by category */
	categoryScores: Record<SmellCategory, number>;
	/** Number of diagnostics by severity */
	diagnosticCounts: Record<Severity, number>;
}

export interface ServerScore {
	serverName: string;
	/** Average score across all tools */
	averageScore: number;
	/** Individual tool scores */
	toolScores: ToolScore[];
	/** Total diagnostics across all tools */
	totalDiagnostics: number;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export interface RuleMeta {
	/** Unique rule ID (e.g. "TS001") */
	id: string;
	/** Short human-readable name */
	name: string;
	/** Full description of what this rule checks */
	description: string;
	/** Smell category */
	category: SmellCategory;
	/** Default severity */
	defaultSeverity: Severity;
	/** URL to documentation for this rule */
	docsUrl?: string;
}

/**
 * A rule is a pure function that receives a tool definition and returns
 * zero or more diagnostics. Rules must be deterministic and side-effect-free.
 */
export interface Rule {
	meta: RuleMeta;
	check(tool: ToolDefinition): Diagnostic[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export type RuleSeverityOverride = Severity | "off";

export interface ToolSpecConfig {
	/** Base config to extend (e.g. "@toolspec/recommended") */
	extends?: string;
	/** Per-rule severity overrides */
	rules?: Record<string, RuleSeverityOverride>;
	/** Client compatibility settings */
	compat?: {
		clients?: string[];
	};
	/** Suggestion engine settings */
	suggest?: {
		maxTokensPerDescription?: number;
	};
	/** Exit with failure if any diagnostic meets this severity */
	failOn?: Severity;
}

// ---------------------------------------------------------------------------
// Analysis Result — what the engine returns after running all rules
// ---------------------------------------------------------------------------

export interface AnalysisResult {
	/** All diagnostics from all rules across all tools */
	diagnostics: Diagnostic[];
	/** Per-tool scores */
	toolScores: ToolScore[];
	/** Per-server aggregate scores */
	serverScores: ServerScore[];
	/** Total number of tools analysed */
	toolCount: number;
	/** Total number of servers */
	serverCount: number;
	/** Timestamp of the analysis */
	timestamp: string;
}
