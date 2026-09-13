'use strict';
function retainVisibleEntities(entities, cameraLeft, rightEdge) {
  return entities.filter(entity => rightEdge(entity) >= cameraLeft - 32);
}
function updateRollingObstacle(obstacle, runnerX, pace, dt) {
  let started = false;
  if (!obstacle.active && obstacle.x - runnerX <= 680) {
    obstacle.active = true; obstacle.vx = -(150 + pace * .18); started = true;
  }
  if (obstacle.active) {
    obstacle.x += obstacle.vx * dt;
    obstacle.rotation += obstacle.vx * dt / 24;
    if (obstacle.x + obstacle.w < obstacle.platform.x) {
      obstacle.vy += 1150 * dt; obstacle.y += obstacle.vy * dt;
    }
  }
  return started;
}
