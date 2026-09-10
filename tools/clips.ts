import type { Pose } from './figure.js';

export interface ClipDef {
  poses: Pose[];
  fps: number;
  loop: boolean;
}

/** All animation clips, shared by every character (poses are proportion-relative). */
export const CLIPS: Record<string, ClipDef> = {
  idle: { fps: 4, loop: true, poses: [
    { bob: 0, armF: [3, 10], armB: [-3, 10], legF: [6, 18], legB: [-6, 18] },
    { bob: -1, armF: [3, 9], armB: [-3, 9], legF: [6, 18], legB: [-6, 18] },
  ] },
  walk: { fps: 8, loop: true, poses: [
    { lean: 2, armF: [4, 9], armB: [-5, 10], legF: [9, 17], legB: [-7, 16] },
    { lean: 2, armF: [2, 10], armB: [-3, 9], legF: [4, 18], legB: [-9, 15] },
  ] },
  backwalk: { fps: 8, loop: true, poses: [
    { lean: -2, armF: [3, 10], armB: [-4, 9], legF: [7, 16], legB: [-9, 17] },
    { lean: -2, armF: [3, 9], armB: [-3, 10], legF: [9, 15], legB: [-4, 18] },
  ] },
  crouch: { fps: 2, loop: false, poses: [
    { crouch: 1, armF: [6, 6], armB: [-4, 7], legF: [8, 10], legB: [-8, 10] },
  ] },
  jump: { fps: 2, loop: false, poses: [
    { bob: -2, crouch: 0.2, armF: [5, 3], armB: [-5, 3], legF: [5, 10], legB: [-6, 12] },
  ] },
  fall: { fps: 2, loop: false, poses: [
    { armF: [6, -2], armB: [-6, -2], legF: [6, 16], legB: [-6, 14] },
  ] },
  dash: { fps: 12, loop: true, poses: [
    { lean: 7, armF: [8, 6], armB: [-9, 9], legF: [11, 16], legB: [-11, 11] },
    { lean: 7, armF: [6, 8], armB: [-7, 7], legF: [5, 17], legB: [-6, 15] },
  ] },
  backdash: { fps: 10, loop: false, poses: [
    { lean: -6, armF: [2, 8], armB: [-4, 8], legF: [-6, 14], legB: [9, 16] },
  ] },
  block: { fps: 2, loop: false, poses: [
    { lean: -1, crouch: 0.05, armF: [4, 1], armB: [3, 5], legF: [4, 18], legB: [-6, 18] },
  ] },
  blockcrouch: { fps: 2, loop: false, poses: [
    { crouch: 1, armF: [6, 2], armB: [4, 4], legF: [7, 10], legB: [-7, 10] },
  ] },
  hit: { fps: 8, loop: false, poses: [
    { lean: -4, headTilt: -2, armF: [-2, 6], armB: [-6, 8], legF: [2, 18], legB: [-8, 16] },
    { lean: -2, headTilt: -1, armF: [0, 8], armB: [-4, 9], legF: [4, 18], legB: [-6, 17] },
  ] },
  airhit: { fps: 4, loop: false, poses: [
    { lean: -5, bob: -2, headTilt: -2, armF: [-4, -2], armB: [-8, 2], legF: [-2, 8], legB: [-9, 10] },
  ] },
  knockdown: { fps: 2, loop: false, poses: [
    { crouch: 1, bob: 8, lean: -9, armF: [-9, 12], armB: [-11, 13], legF: [12, 14], legB: [7, 15] },
  ] },
  ko: { fps: 2, loop: false, poses: [
    { crouch: 1, bob: 12, lean: -10, armF: [-11, 14], armB: [-13, 14], legF: [14, 15], legB: [9, 15] },
  ] },
  win: { fps: 3, loop: true, poses: [
    { bob: -1, armF: [4, -8], armB: [-4, -6], legF: [5, 18], legB: [-6, 18] },
    { bob: 0, armF: [5, -6], armB: [-5, -8], legF: [5, 18], legB: [-6, 18] },
  ] },
  intro: { fps: 3, loop: true, poses: [
    { lean: 3, armF: [6, 4], armB: [-2, 8], legF: [8, 16], legB: [-9, 15] },
    { lean: 3, armF: [7, 3], armB: [-1, 9], legF: [8, 16], legB: [-9, 15] },
  ] },
  punch: { fps: 12, loop: false, poses: [
    { lean: -2, armF: [-3, 8], armB: [-6, 8], legF: [7, 17], legB: [-8, 16] },
    { lean: 5, armF: [17, 6], armB: [-4, 9], legF: [9, 17], legB: [-10, 13] },
    { lean: 2, armF: [9, 8], armB: [-4, 9], legF: [7, 17], legB: [-8, 15] },
  ] },
  punchLow: { fps: 12, loop: false, poses: [
    { crouch: 0.6, armF: [-2, 10], armB: [-5, 9] },
    { crouch: 0.6, armF: [16, 11], armB: [-3, 9] },
    { crouch: 0.6, armF: [8, 11], armB: [-4, 9] },
  ] },
  kick: { fps: 12, loop: false, poses: [
    { lean: -2, armF: [2, 9], armB: [-5, 9], legF: [2, 16], legB: [-7, 16] },
    { lean: 4, armF: [-3, 10], armB: [-8, 7], legF: [19, 10], legB: [-9, 14] },
    { lean: 1, armF: [1, 10], armB: [-6, 9], legF: [9, 16], legB: [-8, 15] },
  ] },
  kickLow: { fps: 12, loop: false, poses: [
    { crouch: 0.5, armF: [2, 9], armB: [-5, 9], legF: [4, 12] },
    { crouch: 0.5, armF: [-2, 10], armB: [-7, 8], legF: [20, 4], legB: [-8, 10] },
    { crouch: 0.5, armF: [1, 10], armB: [-5, 9], legF: [8, 10] },
  ] },
  uppercut: { fps: 13, loop: false, poses: [
    { crouch: 0.7, armF: [-2, 10], armB: [-4, 9], legF: [5, 11], legB: [-5, 11] },
    { crouch: 0, bob: -4, armF: [6, -10], armB: [-4, 4], legF: [3, 14], legB: [-4, 16] },
    { bob: -8, armF: [8, -14], armB: [-2, 0], legF: [2, 12], legB: [-3, 14] },
  ] },
  spin: { fps: 14, loop: false, poses: [
    { lean: 3, armF: [14, 4], armB: [-12, 10], legF: [6, 16], legB: [-12, 12] },
    { bob: -2, armF: [4, -6], armB: [-4, -4], legF: [13, 6], legB: [-6, 14] },
    { lean: -3, armF: [-12, 6], armB: [-14, 4], legF: [12, 10], legB: [-4, 15] },
    { armF: [12, 10], armB: [-6, 6], legF: [4, 16], legB: [-12, 8] },
  ] },
  proj: { fps: 12, loop: false, poses: [
    { crouch: 0.2, armF: [-4, 10], armB: [-9, 10], legF: [6, 16], legB: [-8, 16], fx: 'energy' },
    { lean: 5, armF: [14, 8], armB: [6, 8], legF: [10, 16], legB: [-10, 13], fx: 'proj' },
    { lean: 2, armF: [11, 8], armB: [2, 9], legF: [8, 16], legB: [-8, 15], fx: 'none' },
  ] },
  grab: { fps: 12, loop: false, poses: [
    { lean: 4, armF: [16, 6], armB: [12, 8], legF: [8, 16], legB: [-8, 15] },
    { lean: 2, armF: [12, 6], armB: [10, 8], legF: [7, 16], legB: [-8, 15] },
    { bob: -3, armF: [10, 0], armB: [8, 2], legF: [4, 16], legB: [-5, 16] },
  ] },
  divekick: { fps: 12, loop: false, poses: [
    { bob: -3, crouch: 0.3, legF: [6, 8], legB: [-6, 8], armF: [4, 2], armB: [-4, 2] },
    { lean: 6, legF: [16, 16], legB: [-4, 6], armB: [-8, -2], armF: [-4, -2] },
  ] },
  super: { fps: 13, loop: false, poses: [
    { crouch: 0.4, armF: [-6, 10], armB: [-10, 10], legF: [7, 15], legB: [-8, 15], fx: 'energy' },
    { bob: -3, armF: [2, 2], armB: [-2, 2], legF: [5, 15], legB: [-6, 15], fx: 'energy' },
    { lean: 7, armF: [18, 6], armB: [8, 6], legF: [10, 16], legB: [-10, 13], fx: 'proj' },
    { lean: 4, armF: [14, 6], armB: [6, 7], legF: [9, 16], legB: [-9, 14], fx: 'proj' },
  ] },
};

export const CLIP_NAMES = Object.keys(CLIPS);
export const MAX_FRAMES = Math.max(...Object.values(CLIPS).map((c) => c.poses.length));
