import React, { FC, useState } from 'react';
import { connect } from 'react-redux';
import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts';
import { ReduxContext, State } from 'store';
import { MessageBox, Spinner } from 'components';
import { useQuery } from '@apollo/client';
import { TransferState, TransferSummary } from 'apollo/types';
import { GET_ERROR_SUMMARY_BY_TARGET_CURRENCY } from 'apollo/query';
import * as selectors from '../selectors';
import { TransfersFilter } from '../types';
import { RED_CHART_GRADIENT_COLORS, renderActiveShape, renderRedLegend } from './utils';

const stateProps = (state: State) => ({
  filtersModel: selectors.getTransfersFilter(state),
});
const dispatchProps = () => ({});
interface ConnectorProps {
  filtersModel: TransfersFilter;
}
const BySourceCurrencyChart: FC<ConnectorProps> = ({ filtersModel }) => {
  const { loading, error, data } = useQuery(GET_ERROR_SUMMARY_BY_TARGET_CURRENCY, {
    fetchPolicy: 'no-cache',
    variables: {
      startDate: filtersModel.from,
      endDate: filtersModel.to,
    },
  });
  const [activeIndex, setActiveIndex] = useState<number>();
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
  const onPieLeave = () => {
    setActiveIndex(undefined);
  };
  let content = null;
  if (error) {
    content = <MessageBox kind="danger">Error fetching transfers: {error.message}</MessageBox>;
  } else if (loading) {
    content = <Spinner center />;
  } else {
    // group errors by targetCurrency (sum counts across error codes)
    const grouped: Record<string, number> = data.transferSummary
      .filter((obj: TransferSummary) => obj.group.transferState !== TransferState.Committed)
      .reduce((acc: Record<string, number>, cur: TransferSummary) => {
        const c = cur.group.targetCurrency;
        if (!c) return acc;
        acc[c] = (acc[c] || 0) + cur.count;
        return acc;
      }, {});
    const sorted = Object.entries(grouped)
      .map(([targetCurrency, count]) => ({ targetCurrency, count }))
      .sort((a, b) => b.count - a.count);
    const topThree = sorted.slice(0, 3);
    const otherCount = sorted.slice(3).reduce((n, x) => n + x.count, 0);
    if (otherCount > 0) topThree.push({ targetCurrency: 'Other', count: otherCount });
    content = (
      <PieChart id="ErrorsByTargetCurrencyChart" width={300} height={120}>
        <Legend
          id="ErrorsByTargetCurrencyChartLegend"
          name="Target Currency"
          layout="vertical"
          verticalAlign="middle"
          align="right"
          width={50}
          height={100}
          iconSize={0}
          content={renderRedLegend}
        />
        <Pie
          data={topThree}
          dataKey="count"
          nameKey="targetCurrency"
          innerRadius={30}
          outerRadius={50}
          blendStroke
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          onMouseEnter={onPieEnter}
          onMouseLeave={onPieLeave}
        >
          {topThree.map((_entry: any, index: number) => (
            <Cell
              key={`${_entry.targetCurrency}`}
              fill={RED_CHART_GRADIENT_COLORS[index % RED_CHART_GRADIENT_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    );
  }
  return content;
};

export default connect(stateProps, dispatchProps, null, { context: ReduxContext })(
  BySourceCurrencyChart,
);
