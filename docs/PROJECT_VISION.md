# AoTune Project Vision

## A Personal-First Agent Workspace

AoTune is a private workspace where people can turn interests, research, and creative intentions into useful outputs with AI assistance. The user remains the center of the system: agents support their thinking and making rather than becoming the product themselves.

The long-term experience should feel calm, focused, and personal. English and Chinese interfaces are planned so users can choose the language that best supports each activity.

## Workspace-Based Design

AoTune organizes activity into purpose-built workspaces instead of one universal chat stream. Each workspace can eventually provide its own tools, context, agent behavior, and artifact types while sharing a consistent application foundation.

The five initial directions are Japanese Lyrics Learning, Cosplay Planning, Creative Studio, Japanese Music Research, and Personal Branding Studio. Japanese Lyrics Learning is the first implementation target, not the limit or sole meaning of AoTune.

## Persistent Artifacts

Chat is temporary; useful work should endure. AoTune will treat outputs such as learning notes, vocabulary records, research cards, cosplay plans, creative prompts, visual concepts, and identity materials as persistent artifacts that users can revisit and refine.

Later phases can establish a shared artifact model, links between artifacts and source conversations, revision history, export options, and user-controlled organization. Phase 0 intentionally introduces none of this storage complexity.

## Why AoTune Is Not a Social Network

AoTune is designed around private creation and reflection, not feeds, follower counts, engagement metrics, or public performance. Its primary loop is creating a workspace, working with an agent, and keeping a useful artifact.

Sharing or collaboration may eventually exist as deliberate, bounded actions. They should not change the product into an attention marketplace or make public identity a requirement for receiving value.

## Future IAM Direction

Identity and access management will become important as artifacts become persistent and collaboration becomes possible. A future IAM layer should support account identity, workspace ownership, explicit roles, least-privilege access, and auditable changes.

The architecture should leave room for identity-aware authorization and audit logging without adding premature authentication or permission models during initialization. Future access controls should be enforced at service boundaries and apply consistently to workspaces, artifacts, agent actions, and exports.
