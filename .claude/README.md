# .claude Directory

This directory contains project-specific configuration and customizations for Claude Code.

## Structure

```
.claude/
├── rules/          # Custom rules and instructions
├── skills/         # Custom skills and commands
└── README.md       # This file
```

## Rules

The `rules/` directory contains markdown files with project-specific guidelines, constraints, and instructions that Claude should follow when working on this project.

**Examples:**
- Code style requirements
- Security guidelines
- Testing requirements
- Deployment procedures
- Domain-specific constraints

## Skills

The `skills/` directory contains reusable procedures and commands that can be invoked during development.

**Examples:**
- Build and deployment workflows
- Testing procedures
- Code generation templates
- Project-specific utilities

## Usage

Claude automatically reads files from this directory to understand project-specific context. You don't need to manually reference these files in conversations.

## Best Practices

1. **Keep rules focused**: Each rule file should cover a specific aspect
2. **Make skills actionable**: Skills should have clear steps and outcomes
3. **Update regularly**: Keep documentation in sync with project changes
4. **Use clear names**: File names should clearly indicate their purpose
5. **Remove examples**: Delete the example files once you've created your own
