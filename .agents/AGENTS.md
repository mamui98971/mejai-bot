# Mejai Project Rules

<RULE[project_testing]>
When running scripts or testing features that require a specific user, ALWAYS use Nick's primary Supabase User ID (UID):
`aaf5b678-5712-44bb-a129-7540116066f8`

Nick's test account is currently aliased as "อาบิโด้". You can also fetch this ID securely by using `process.env.ADMIN_UID` since it is stored in the environment variables. DO NOT query the most recent user, as it might inadvertently modify real users' data.
</RULE[project_testing]>
