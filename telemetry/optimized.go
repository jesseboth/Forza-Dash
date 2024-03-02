
package main

var requireds32 = map[string]bool{
	"IsRaceOn": 	true,
	"CarOrdinal": true,
}

var requiredu32 = map[string]bool{
	"TimestampMS": false,
}

var requiredf32 = map[string]bool{
	"DistanceTraveled":    true,
	"Fuel":                true,
	"EngineMaxRpm":        true,
	"CurrentEngineRpm":    true,
	"Speed":               true,
	"CurrentLap":          true,
	"BestLap":             true,
	"TireTempFrontRight":  true,
	"TireTempFrontLeft":   true,
	"TireTempRearRight":   true,
	"TireTempRearLeft":    true,
	"TireWearFrontRight":  true,
	"TireWearFrontLeft":   true,
	"TireWearRearRight":   true,
	"TireWearRearLeft":    true,
}
var requiredu16 = map[string]bool{
	"LapNumber": false,
}

var requiredu8 = map[string]bool{
	"RacePosition": true,
	"Gear": 				true,
}


var requireds8 = map[string]bool{
	"Steer": false,
}