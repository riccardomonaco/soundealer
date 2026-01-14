export const DEFAULT_HEIGHT = 128;
export const MAX_CANVAS_WIDTH = 8000;
export const MAX_NODES = 10;
export function clampToUnit(value) {
    if (value < 0)
        return 0;
    if (value > 1)
        return 1;
    return value;
}
export function calculateBarRenderConfig({ width, height, length, options, pixelRatio, }) {
    const halfHeight = height / 2;
    const barWidth = options.barWidth ? options.barWidth * pixelRatio : 1;
    const barGap = options.barGap ? options.barGap * pixelRatio : options.barWidth ? barWidth / 2 : 0;
    const barRadius = options.barRadius || 0;
    const spacing = barWidth + barGap || 1;
    const barIndexScale = length > 0 ? width / spacing / length : 0;
    return {
        halfHeight,
        barWidth,
        barGap,
        barRadius,
        barIndexScale,
        barSpacing: spacing,
    };
}
export function calculateBarHeights({ maxTop, maxBottom, halfHeight, vScale, }) {
    const topHeight = Math.round(maxTop * halfHeight * vScale);
    const bottomHeight = Math.round(maxBottom * halfHeight * vScale);
    const totalHeight = topHeight + bottomHeight || 1;
    return { topHeight, totalHeight };
}
export function resolveBarYPosition({ barAlign, halfHeight, topHeight, totalHeight, canvasHeight, }) {
    if (barAlign === 'top')
        return 0;
    if (barAlign === 'bottom')
        return canvasHeight - totalHeight;
    return halfHeight - topHeight;
}
export function calculateBarSegments({ channelData, barIndexScale, barSpacing, barWidth, halfHeight, vScale, canvasHeight, barAlign, }) {
    const topChannel = channelData[0] || [];
    const bottomChannel = channelData[1] || topChannel;
    const length = topChannel.length;
    const segments = [];
    let prevX = 0;
    let maxTop = 0;
    let maxBottom = 0;
    for (let i = 0; i <= length; i++) {
        const x = Math.round(i * barIndexScale);
        if (x > prevX) {
            const { topHeight, totalHeight } = calculateBarHeights({
                maxTop,
                maxBottom,
                halfHeight,
                vScale,
            });
            const y = resolveBarYPosition({
                barAlign,
                halfHeight,
                topHeight,
                totalHeight,
                canvasHeight,
            });
            segments.push({
                x: prevX * barSpacing,
                y,
                width: barWidth,
                height: totalHeight,
            });
            prevX = x;
            maxTop = 0;
            maxBottom = 0;
        }
        const magnitudeTop = Math.abs(topChannel[i] || 0);
        const magnitudeBottom = Math.abs(bottomChannel[i] || 0);
        if (magnitudeTop > maxTop)
            maxTop = magnitudeTop;
        if (magnitudeBottom > maxBottom)
            maxBottom = magnitudeBottom;
    }
    return segments;
}
export function getRelativePointerPosition(rect, clientX, clientY) {
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const relativeX = x / rect.width;
    const relativeY = y / rect.height;
    return [relativeX, relativeY];
}
export function resolveChannelHeight({ optionsHeight, optionsSplitChannels, parentHeight, numberOfChannels, defaultHeight = DEFAULT_HEIGHT, }) {
    if (optionsHeight == null)
        return defaultHeight;
    const numericHeight = Number(optionsHeight);
    if (!isNaN(numericHeight))
        return numericHeight;
    if (optionsHeight === 'auto') {
        const height = parentHeight || defaultHeight;
        if (optionsSplitChannels === null || optionsSplitChannels === void 0 ? void 0 : optionsSplitChannels.every((channel) => !channel.overlay)) {
            return height / numberOfChannels;
        }
        return height;
    }
    return defaultHeight;
}
export function getPixelRatio(devicePixelRatio) {
    return Math.max(1, devicePixelRatio || 1);
}
export function shouldRenderBars(options) {
    return Boolean(options.barWidth || options.barGap || options.barAlign);
}
export function resolveColorValue(color, devicePixelRatio) {
    if (!Array.isArray(color))
        return color || '';
    if (color.length === 0)
        return '#999';
    if (color.length < 2)
        return color[0] || '';
    const canvasElement = document.createElement('canvas');
    const ctx = canvasElement.getContext('2d');
    const gradientHeight = canvasElement.height * devicePixelRatio;
    const gradient = ctx.createLinearGradient(0, 0, 0, gradientHeight || devicePixelRatio);
    const colorStopPercentage = 1 / (color.length - 1);
    color.forEach((value, index) => {
        gradient.addColorStop(index * colorStopPercentage, value);
    });
    return gradient;
}
export function calculateWaveformLayout({ duration, minPxPerSec = 0, parentWidth, fillParent, pixelRatio, }) {
    const scrollWidth = Math.ceil(duration * minPxPerSec);
    const isScrollable = scrollWidth > parentWidth;
    const useParentWidth = Boolean(fillParent && !isScrollable);
    const width = (useParentWidth ? parentWidth : scrollWidth) * pixelRatio;
    return {
        scrollWidth,
        isScrollable,
        useParentWidth,
        width,
    };
}
export function clampWidthToBarGrid(width, options) {
    if (!shouldRenderBars(options))
        return width;
    const barWidth = options.barWidth || 0.5;
    const barGap = options.barGap || barWidth / 2;
    const totalBarWidth = barWidth + barGap;
    if (totalBarWidth === 0)
        return width;
    return Math.floor(width / totalBarWidth) * totalBarWidth;
}
export function calculateSingleCanvasWidth({ clientWidth, totalWidth, options, }) {
    const baseWidth = Math.min(MAX_CANVAS_WIDTH, clientWidth, totalWidth);
    return clampWidthToBarGrid(baseWidth, options);
}
export function sliceChannelData({ channelData, offset, clampedWidth, totalWidth, }) {
    return channelData.map((channel) => {
        const start = Math.floor((offset / totalWidth) * channel.length);
        const end = Math.floor(((offset + clampedWidth) / totalWidth) * channel.length);
        return channel.slice(start, end);
    });
}
export function shouldClearCanvases(currentNodeCount) {
    return currentNodeCount > MAX_NODES;
}
export function getLazyRenderRange({ scrollLeft, totalWidth, numCanvases, }) {
    if (totalWidth === 0)
        return [0];
    const viewPosition = scrollLeft / totalWidth;
    const startCanvas = Math.floor(viewPosition * numCanvases);
    return [startCanvas - 1, startCanvas, startCanvas + 1];
}
export function calculateVerticalScale({ channelData, barHeight, normalize, }) {
    var _a;
    const baseScale = barHeight || 1;
    if (!normalize)
        return baseScale;
    const firstChannel = channelData[0];
    if (!firstChannel || firstChannel.length === 0)
        return baseScale;
    let max = 0;
    for (let i = 0; i < firstChannel.length; i++) {
        const value = (_a = firstChannel[i]) !== null && _a !== void 0 ? _a : 0;
        const magnitude = Math.abs(value);
        if (magnitude > max)
            max = magnitude;
    }
    if (!max)
        return baseScale;
    return baseScale / max;
}
export function calculateLinePaths({ channelData, width, height, vScale, }) {
    const halfHeight = height / 2;
    const primaryChannel = channelData[0] || [];
    const secondaryChannel = channelData[1] || primaryChannel;
    const channels = [primaryChannel, secondaryChannel];
    return channels.map((channel, index) => {
        const length = channel.length;
        const hScale = length ? width / length : 0;
        const baseY = halfHeight;
        const direction = index === 0 ? -1 : 1;
        const path = [{ x: 0, y: baseY }];
        let prevX = 0;
        let max = 0;
        for (let i = 0; i <= length; i++) {
            const x = Math.round(i * hScale);
            if (x > prevX) {
                const heightDelta = Math.round(max * halfHeight * vScale) || 1;
                const y = baseY + heightDelta * direction;
                path.push({ x: prevX, y });
                prevX = x;
                max = 0;
            }
            const value = Math.abs(channel[i] || 0);
            if (value > max)
                max = value;
        }
        path.push({ x: prevX, y: baseY });
        return path;
    });
}
export function calculateScrollPercentages({ scrollLeft, clientWidth, scrollWidth, }) {
    if (scrollWidth === 0) {
        return { startX: 0, endX: 0 };
    }
    const startX = scrollLeft / scrollWidth;
    const endX = (scrollLeft + clientWidth) / scrollWidth;
    return { startX, endX };
}
export function roundToHalfAwayFromZero(value) {
    const scaled = value * 2;
    const rounded = scaled < 0 ? Math.floor(scaled) : Math.ceil(scaled);
    return rounded / 2;
}
