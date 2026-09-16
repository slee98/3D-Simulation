# Liquid Handler 3D Simulator

An interactive 3D simulation of a laboratory liquid-handling system

This project explores how lab automation workflows can be **visualized and tested virtually before running them on a physical instrument**.


<!-- Replace this with your simulator screenshot -->
<p align="center">
  <img 
    src="https://github.com/user-attachments/assets/ebf0904e-ad2b-488d-b932-81453a162f86"
    width="900"
    alt="Hamilton 3D Simulator"
  />
</p>


## Why I Built This

In laboratory automation, workflow issues are often discovered only after a method is running on the physical instrument.

That can make development and iteration slow, especially when testing:

* deck layouts
* labware positions
* pipetting sequences
* liquid transfers
* robotic head movements

I wanted to explore a different approach:

> What if we could visualize and simulate the workflow before running it in the lab?

This project is a prototype exploring that idea through an interactive 3D environment.

## Features

* Interactive 3D liquid-handler deck
* Drag-and-drop labware placement
* 96-channel and 8-channel pipetting head visualization
* Tip loading and unloading simulation
* Aspirate and dispense visualization
* Multiple labware types
* Adjustable simulation speed
* Isometric and top-down views
* Persistent deck layouts using browser local storage
* Visualization of configurable deck modules

## Concept

The simulator is intended as an exploration of a lightweight **digital twin / virtual prototyping environment for lab automation**.

A future version could potentially connect higher-level automation methods or protocol definitions to the 3D environment so that engineers can inspect:

**Protocol → Deck Layout → Robot Motion → Liquid Transfer → Physical Run**

before executing the workflow on an actual liquid handler.

## Tech Stack

* React
* TypeScript
* Three.js
* React Three Fiber
* React Three Drei
* Tailwind CSS
* Vite

## Run Locally

**Prerequisite:** Node.js

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Then open the local application in your browser.

## Status

This is an experimental side project built to explore the intersection of:

**Lab Automation × 3D Simulation × Software Engineering × AI-assisted Development**

The goal is not to reproduce the complete Hamilton control environment, but to experiment with new ways of designing, visualizing, and debugging automated laboratory workflows.
