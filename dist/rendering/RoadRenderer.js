import { GameConfig, laneWidth } from '../config/GameConfig.js';
import { clamp } from '../utils/MathUtils.js';
import { deterministicNoise } from '../utils/Random.js';
import { fillRoundedRectangle, strokeRoundedRectangle } from './CanvasDrawing.js';
export class RoadRenderer {
    render(context, playerDistanceMeters, speedKmh = 0) {
        const motionIntensity = clamp(speedKmh / GameConfig.player.maximumSpeedKmh, 0, 1);
        this.drawGrass(context);
        this.drawScenery(context, playerDistanceMeters, motionIntensity);
        this.drawRoad(context, playerDistanceMeters, motionIntensity);
        this.drawRoadsideSigns(context, playerDistanceMeters);
    }
    drawGrass(context) {
        const gradient = context.createLinearGradient(0, 0, GameConfig.canvas.width, 0);
        gradient.addColorStop(0, '#7fca2e');
        gradient.addColorStop(0.5, '#5fae20');
        gradient.addColorStop(1, '#83d936');
        context.fillStyle = gradient;
        context.fillRect(0, 0, GameConfig.canvas.width, GameConfig.canvas.height);
    }
    drawRoad(context, playerDistanceMeters, motionIntensity) {
        const roadLeft = GameConfig.road.left;
        const roadWidth = GameConfig.road.right - GameConfig.road.left;
        const roadGradient = context.createLinearGradient(roadLeft, 0, GameConfig.road.right, 0);
        roadGradient.addColorStop(0, '#252a31');
        roadGradient.addColorStop(0.5, '#353a42');
        roadGradient.addColorStop(1, '#252a31');
        context.fillStyle = roadGradient;
        context.fillRect(roadLeft, 0, roadWidth, GameConfig.canvas.height);
        context.fillStyle = '#1e2329';
        context.fillRect(roadLeft - GameConfig.road.shoulderWidth, 0, GameConfig.road.shoulderWidth, GameConfig.canvas.height);
        context.fillRect(GameConfig.road.right, 0, GameConfig.road.shoulderWidth, GameConfig.canvas.height);
        this.drawShoulderRumbleStrips(context, playerDistanceMeters, motionIntensity);
        context.save();
        context.beginPath();
        context.rect(roadLeft, 0, roadWidth, GameConfig.canvas.height);
        context.clip();
        this.drawAsphaltTexture(context, playerDistanceMeters, motionIntensity);
        this.drawLaneMarkers(context, playerDistanceMeters, motionIntensity);
        this.drawRoadMotionLines(context, playerDistanceMeters, motionIntensity);
        context.restore();
        context.fillStyle = '#d6d1c7';
        context.fillRect(roadLeft - GameConfig.road.shoulderWidth - 8, 0, 8, GameConfig.canvas.height);
        context.fillRect(GameConfig.road.right + GameConfig.road.shoulderWidth, 0, 8, GameConfig.canvas.height);
    }
    drawShoulderRumbleStrips(context, playerDistanceMeters, motionIntensity) {
        const spacing = 34;
        const offset = (playerDistanceMeters * GameConfig.world.pixelsPerMeter * (1.25 + motionIntensity * 0.75)) % spacing;
        context.save();
        context.fillStyle = 'rgba(248, 250, 252, 0.55)';
        for (let y = -spacing + offset; y < GameConfig.canvas.height + spacing; y += spacing) {
            context.fillRect(GameConfig.road.left - 22, y, 12, 15);
            context.fillRect(GameConfig.road.right + 10, y, 12, 15);
        }
        context.restore();
    }
    drawLaneMarkers(context, playerDistanceMeters, motionIntensity) {
        const markerCycle = GameConfig.road.dashedLineHeight + GameConfig.road.dashedLineGap;
        const visualDistance = playerDistanceMeters * (1 + motionIntensity * 0.32);
        const offset = (visualDistance * GameConfig.world.pixelsPerMeter) % markerCycle;
        const width = laneWidth();
        for (let lane = 1; lane < GameConfig.road.laneCount; lane += 1) {
            const x = GameConfig.road.left + lane * width;
            for (let y = -markerCycle + offset; y < GameConfig.canvas.height + markerCycle; y += markerCycle) {
                if (motionIntensity > 0.25) {
                    fillRoundedRectangle(context, x - 5, y + GameConfig.road.dashedLineHeight * 0.55, 10, GameConfig.road.dashedLineHeight * motionIntensity, 5, `rgba(248, 250, 252, ${0.14 * motionIntensity})`);
                }
                fillRoundedRectangle(context, x - 4, y, 8, GameConfig.road.dashedLineHeight, 4, '#f8fafc');
            }
        }
        context.fillStyle = '#facc15';
        context.fillRect(GameConfig.road.left + 8, 0, 4, GameConfig.canvas.height);
        context.fillRect(GameConfig.road.right - 12, 0, 4, GameConfig.canvas.height);
        this.drawSubtleLaneChevrons(context, playerDistanceMeters, motionIntensity);
    }
    drawSubtleLaneChevrons(context, playerDistanceMeters, motionIntensity) {
        if (motionIntensity < 0.18)
            return;
        const spacing = 178;
        const offset = (playerDistanceMeters * GameConfig.world.pixelsPerMeter * (1.08 + motionIntensity * 0.55)) % spacing;
        const width = laneWidth();
        context.save();
        context.strokeStyle = `rgba(147, 197, 253, ${0.06 + motionIntensity * 0.12})`;
        context.lineWidth = 5;
        context.lineCap = 'round';
        for (let lane = 0; lane < GameConfig.road.laneCount; lane += 1) {
            const centerX = GameConfig.road.left + width * (lane + 0.5);
            for (let y = -spacing + offset; y < GameConfig.canvas.height + spacing; y += spacing) {
                context.beginPath();
                context.moveTo(centerX - 24, y + 24);
                context.lineTo(centerX, y + 46);
                context.lineTo(centerX + 24, y + 24);
                context.stroke();
            }
        }
        context.restore();
    }
    drawAsphaltTexture(context, playerDistanceMeters, motionIntensity) {
        const rowSpacing = 24;
        const visualOffset = (playerDistanceMeters * GameConfig.world.pixelsPerMeter * (1.4 + motionIntensity * 1.2)) % rowSpacing;
        const firstRow = Math.floor(playerDistanceMeters * 3);
        const lanePixelWidth = laneWidth();
        context.save();
        for (let row = -2; row < Math.ceil(GameConfig.canvas.height / rowSpacing) + 3; row += 1) {
            const rowIndex = firstRow + row;
            const y = row * rowSpacing + visualOffset;
            for (let lane = 0; lane < GameConfig.road.laneCount; lane += 1) {
                const laneLeft = GameConfig.road.left + lanePixelWidth * lane;
                const markCount = 2;
                for (let mark = 0; mark < markCount; mark += 1) {
                    const salt = lane * 101 + mark * 29;
                    const localX = 18 + deterministicNoise(rowIndex, salt + 5) * Math.max(8, lanePixelWidth - 54);
                    const x = laneLeft + localX;
                    const width = 8 + deterministicNoise(rowIndex, salt + 11) * 26;
                    const alpha = 0.03 + motionIntensity * 0.045;
                    const localY = y + deterministicNoise(rowIndex, salt + 17) * 11;
                    fillRoundedRectangle(context, x, localY, width, 2, 1, `rgba(255, 255, 255, ${alpha})`);
                }
            }
        }
        context.restore();
    }
    drawRoadMotionLines(context, playerDistanceMeters, motionIntensity) {
        if (motionIntensity < 0.22)
            return;
        const rowSpacing = 58;
        const visualOffset = (playerDistanceMeters * GameConfig.world.pixelsPerMeter * (2.1 + motionIntensity * 1.9)) % rowSpacing;
        const firstRow = Math.floor(playerDistanceMeters * 4);
        const lanePixelWidth = laneWidth();
        const lineLength = 20 + motionIntensity * 58;
        context.save();
        context.lineWidth = 3;
        context.lineCap = 'round';
        for (let row = -2; row < Math.ceil(GameConfig.canvas.height / rowSpacing) + 3; row += 1) {
            const rowIndex = firstRow + row;
            const y = row * rowSpacing + visualOffset;
            for (let lane = 0; lane < GameConfig.road.laneCount; lane += 1) {
                const laneLeft = GameConfig.road.left + lanePixelWidth * lane;
                const laneSalt = lane * 131;
                const shouldDrawFirstLine = deterministicNoise(rowIndex, laneSalt + 19) > 0.22;
                const shouldDrawSecondLine = deterministicNoise(rowIndex, laneSalt + 37) > 0.68;
                const linesInLane = shouldDrawSecondLine ? 2 : shouldDrawFirstLine ? 1 : 0;
                for (let line = 0; line < linesInLane; line += 1) {
                    const x = laneLeft + 22 + deterministicNoise(rowIndex, laneSalt + line * 53 + 47) * Math.max(8, lanePixelWidth - 52);
                    const alpha = 0.07 + motionIntensity * 0.15;
                    context.strokeStyle = `rgba(226, 232, 240, ${alpha})`;
                    context.beginPath();
                    context.moveTo(x, y);
                    context.lineTo(x, y + lineLength);
                    context.stroke();
                }
            }
        }
        context.restore();
    }
    drawScenery(context, playerDistanceMeters, motionIntensity) {
        const spacingMeters = GameConfig.world.scenerySpacingMeters;
        const firstSegment = Math.floor((playerDistanceMeters - 110) / spacingMeters);
        const lastSegment = Math.ceil((playerDistanceMeters + 190) / spacingMeters);
        for (let segment = firstSegment; segment <= lastSegment; segment += 1) {
            const worldDistance = segment * spacingMeters;
            const y = GameConfig.player.screenY - (worldDistance - playerDistanceMeters) * GameConfig.world.pixelsPerMeter;
            if (y < -140 || y > GameConfig.canvas.height + 140)
                continue;
            this.drawSceneryPair(context, segment, y, motionIntensity);
        }
    }
    drawSceneryPair(context, segment, y, motionIntensity) {
        const leftX = 55 + deterministicNoise(segment, 3) * 120;
        const rightX = GameConfig.canvas.width - 175 + deterministicNoise(segment, 7) * 120;
        const leftType = deterministicNoise(segment, 11);
        const rightType = deterministicNoise(segment, 17);
        this.drawSceneryItem(context, leftX, y, leftType, segment, motionIntensity);
        this.drawSceneryItem(context, rightX, y + deterministicNoise(segment, 29) * 40 - 20, rightType, segment + 1000, motionIntensity);
    }
    drawSceneryItem(context, x, y, typeNoise, seed, motionIntensity) {
        if (motionIntensity > 0.45) {
            fillRoundedRectangle(context, x - 14, y + 26, 28, 22 + motionIntensity * 38, 12, `rgba(20, 83, 45, ${0.08 + motionIntensity * 0.1})`);
        }
        if (typeNoise < 0.52) {
            this.drawTree(context, x, y, 22 + deterministicNoise(seed, 31) * 18);
        }
        else if (typeNoise < 0.82) {
            this.drawBuilding(context, x, y, 48 + deterministicNoise(seed, 37) * 34, 40 + deterministicNoise(seed, 41) * 55);
        }
        else {
            this.drawFlowersAndRock(context, x, y, seed);
        }
    }
    drawTree(context, x, y, radius) {
        context.save();
        context.fillStyle = '#7c3f16';
        fillRoundedRectangle(context, x - 8, y + radius * 0.35, 16, 28, 7, '#7c3f16');
        context.fillStyle = '#2f7d1f';
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.arc(x - radius * 0.45, y + 4, radius * 0.72, 0, Math.PI * 2);
        context.arc(x + radius * 0.45, y + 6, radius * 0.72, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#145b1d';
        context.lineWidth = 3;
        context.stroke();
        context.restore();
    }
    drawBuilding(context, x, y, width, height) {
        context.save();
        const colors = ['#fca5a5', '#93c5fd', '#fde68a', '#c4b5fd', '#99f6e4'];
        const color = colors[Math.floor((x + y + width) % colors.length)];
        fillRoundedRectangle(context, x - width / 2, y - height / 2, width, height, 8, color);
        strokeRoundedRectangle(context, x - width / 2, y - height / 2, width, height, 8, 'rgba(30, 41, 59, 0.5)', 2);
        context.fillStyle = 'rgba(15, 23, 42, 0.33)';
        for (let windowY = y - height / 2 + 10; windowY < y + height / 2 - 8; windowY += 18) {
            for (let windowX = x - width / 2 + 9; windowX < x + width / 2 - 9; windowX += 18) {
                context.fillRect(windowX, windowY, 8, 8);
            }
        }
        context.restore();
    }
    drawFlowersAndRock(context, x, y, seed) {
        context.save();
        fillRoundedRectangle(context, x - 14, y - 5, 28, 18, 9, '#a98552');
        context.fillStyle = '#f9a8d4';
        for (let i = 0; i < 5; i += 1) {
            const angle = (Math.PI * 2 * i) / 5;
            const flowerX = x + 42 + Math.cos(angle) * (10 + deterministicNoise(seed, i) * 8);
            const flowerY = y + Math.sin(angle) * (10 + deterministicNoise(seed, i + 8) * 8);
            context.beginPath();
            context.arc(flowerX, flowerY, 5, 0, Math.PI * 2);
            context.fill();
        }
        context.fillStyle = '#fef08a';
        context.beginPath();
        context.arc(x + 42, y, 4, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
    drawRoadsideSigns(context, playerDistanceMeters) {
        const signEveryMeters = 620;
        const nextSignDistance = Math.ceil(playerDistanceMeters / signEveryMeters) * signEveryMeters + 180;
        const y = GameConfig.player.screenY - (nextSignDistance - playerDistanceMeters) * GameConfig.world.pixelsPerMeter;
        if (y < -80 || y > GameConfig.canvas.height + 80)
            return;
        const isLeft = Math.floor(nextSignDistance / signEveryMeters) % 2 === 0;
        const x = isLeft ? 110 : GameConfig.canvas.width - 110;
        context.save();
        context.strokeStyle = '#475569';
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(x - 28, y + 30);
        context.lineTo(x - 28, y + 90);
        context.moveTo(x + 28, y + 30);
        context.lineTo(x + 28, y + 90);
        context.stroke();
        fillRoundedRectangle(context, x - 75, y - 28, 150, 58, 10, isLeft ? '#15803d' : '#2563eb');
        strokeRoundedRectangle(context, x - 75, y - 28, 150, 58, 10, '#f8fafc', 3);
        context.fillStyle = '#ffffff';
        context.font = '800 18px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(isLeft ? 'NEXT CITY' : 'REST AREA', x, y - 6);
        context.font = '700 16px Inter, system-ui, sans-serif';
        context.fillText(`${Math.max(1, Math.round((nextSignDistance - playerDistanceMeters) / 1000))} KM`, x, y + 15);
        context.restore();
    }
}
