# Screeps AI
## Modular Approach

Divide AI into modules that can accomplish individual goals. These modules are created and assigned to an area or location, multiple instances of an AI module can be created with different assigned goals. During their execution they could generate more AI modules, they can repeat and maintain their own state. After their assignment is complete they self terminate.

Modules have components that can be assigned to them, and they have internal states that they can change themselves. This is so that the local controller AI can decide what type of mine should be built, and upgrade it when the infrastructure can support it. The mine AI isn't concerned with if it should upgrade it's miner type, it is told what features it should have and it is only concerned with running that type.

For example a module to manage a mine.
- Makes requests for miners and haulers
- Verifies it's road still reaches it's base
- Controls the units assigned to it

There should be components of the Mine AI, that can be added or removed.
- Use dedicated haulers and miners
- Use simple hybrids
- Use local storage

And it has external connections
- The controller it belongs to. Requests for new units and resources will be sent to this controller.

### Controller AI
- Manages creation of units
- Keeps track of storage buildings
- Manages local road network
- Has connections to neighboring rooms

### Region AI
### Mine AI
### Exploration AI
### Attack AI
### Defend AI



## Data
There are many different data objects representing the state of the world. As things are learned by the AI they get stored and these data types help process them.

###Roads
- Age, expected death tick